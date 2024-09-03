/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';

/**
 * # Tracking CSP violations
 *
 * Add the following settings to your `kibana.dev.yml`:
 *
 * ```yml
 * server.customResponseHeaders.Reporting-Endpoints: violations-endpoint="https://localhost:5601/xyz/internal/security/analytics/_record_violations"
 * csp.report_to: [violations-endpoint]
 * ```
 *
 * Note: The endpoint has to be on HTTPS and has to be a fully qualified URL including protocol and
 * hostname, otherwise browsers might not send any reports. When using `server.publicBaseUrl` setting
 * you should use the same origin for the reporting endpoint since Kibana does not support
 * cross-origin content negotiation so browsers would not be able to send any report.
 *
 * # Debugging CSP violations
 *
 * CSP violations are tracked (batched) using event based telemetry.
 *
 * To print telemetry events to the terminal add the following config to your `kibana.dev.yml`:
 *
 * ```yml
 * logging.loggers:
 *   - name: analytics
 *     level: all
 *     appenders: [console]
 * ```
 */

/**
 * Schema that validates CSP violation reports according to W3C spec.
 *
 * https://www.w3.org/TR/CSP3/#reporting
 */
const cspViolationReportSchema = schema.object(
  {
    type: schema.literal('csp-violation'),
    age: schema.maybe(schema.number()),
    url: schema.string(),
    user_agent: schema.maybe(schema.string()),
    body: schema.object(
      {
        documentURL: schema.string(),
        referrer: schema.maybe(schema.string()),
        blockedURL: schema.maybe(schema.string()),
        effectiveDirective: schema.string(),
        originalPolicy: schema.string(),
        sourceFile: schema.maybe(schema.string()),
        sample: schema.maybe(schema.string()),
        disposition: schema.oneOf([schema.literal('enforce'), schema.literal('report')]),
        statusCode: schema.number(),
        lineNumber: schema.maybe(schema.number()),
        columnNumber: schema.maybe(schema.number()),
      },
      { unknowns: 'ignore' }
    ),
  },
  { unknowns: 'ignore' }
);

/**
 * Interface that represents a CSP violation report according to W3C spec.
 */
export type CSPViolationReport = TypeOf<typeof cspViolationReportSchema>;

/**
 * Schema that validates permissions policy violation reports according to W3C spec.
 *
 * https://w3c.github.io/webappsec-permissions-policy/#reporting
 */
export const permissionsPolicyViolationReportSchema = schema.object(
  {
    type: schema.literal('permissions-policy-violation'),
    age: schema.maybe(schema.number()),
    url: schema.string(),
    user_agent: schema.maybe(schema.string()),
    body: schema.object(
      {
        /**
         * The string identifying the policy-controlled feature whose policy has been violated. This string can be used for grouping and counting related reports.
         * Spec mentions featureId, however the report that is sent from Chrome has policyId. This is to handle both cases.
         */
        policyId: schema.maybe(schema.string()),
        /**
         * The string identifying the policy-controlled feature whose policy has been violated. This string can be used for grouping and counting related reports.
         */
        featureId: schema.maybe(schema.string()),
        /**
         * If known, the file where the violation occured, or null otherwise.
         */
        sourceFile: schema.maybe(schema.string()),
        /**
         * If known, the line number in sourceFile where the violation occured, or null otherwise.
         */
        lineNumber: schema.maybe(schema.number()),
        /**
         * If known, the column number in sourceFile where the violation occured, or null otherwise.
         */
        columnNumber: schema.maybe(schema.number()),
        /**
         * A string indicating whether the violated permissions policy was enforced in this case. disposition will be set to "enforce" if the policy was enforced, or "report" if the violation resulted only in this report being generated (with no further action taken by the user agent in response to the violation).
         */
        disposition: schema.oneOf([schema.literal('enforce'), schema.literal('report')]),
      },
      { unknowns: 'ignore' }
    ),
  },
  { unknowns: 'ignore' }
);

/**
 * Interface that represents a permissions policy violation report according to W3C spec.
 */
export type PermissionsPolicyViolationReport = TypeOf<
  typeof permissionsPolicyViolationReportSchema
>;

/**
 * This endpoint receives reports from the user's browser via the Reporting API when one of our
 * `Content-Security-Policy` or `Permissions-Policy` directives have been violated.
 */
export function defineRecordViolations({ router, analyticsService }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/analytics/_record_violations',
      validate: {
        /**
         * Chrome supports CSP3 spec and sends an array of reports. Safari only sends a single
         * report so catering for both here.
         */
        body: schema.oneOf([
          schema.arrayOf(
            schema.oneOf([cspViolationReportSchema, permissionsPolicyViolationReportSchema])
          ),
          cspViolationReportSchema,
          permissionsPolicyViolationReportSchema,
        ]),
      },
      options: {
        /**
         * Browsers will stop sending reports for the duration of the browser session and without
         * further retries once this endpoint has returned a single 403. This would effectively
         * prevent us from capture any reports. To work around this behaviour we optionally
         * authenticate users but silently ignore any reports that have been received from
         * unauthenticated users.
         */
        authRequired: 'optional',
        /**
         * This endpoint is called by the browser in the background so `kbn-xsrf` header is not sent.
         */
        xsrfRequired: false,
        access: 'public',
        body: {
          /**
           * Both `application/reports+json` (CSP3 spec) and `application/csp-report` (Safari) are
           * valid values but Hapi does not parse the request body when `application/csp-report` is
           * specified so enforcing JSON mime-type for this endpoint.
           */
          override: 'application/json',
        },
      },
    },
    async (context, request, response) => {
      if (request.auth.isAuthenticated) {
        const reports = Array.isArray(request.body) ? request.body : [request.body];
        const now = Date.now();
        reports.forEach((report) => {
          if (report.type === 'csp-violation') {
            analyticsService.reportCSPViolation({
              created: `${now + (report.age ?? 0)}`,
              url: report.url,
              user_agent: report.user_agent ?? getLastHeader(request.headers['user-agent']),
              ...report.body,
            });
          } else if (report.type === 'permissions-policy-violation') {
            analyticsService.reportPermissionsPolicyViolation({
              created: `${now + (report.age ?? 0)}`,
              url: report.url,
              user_agent: report.user_agent ?? getLastHeader(request.headers['user-agent']),
              ...report.body,
            });
          }
        });
      }
      return response.ok();
    }
  );
}

function getLastHeader(header: string | string[] | undefined) {
  return Array.isArray(header) ? header[header.length - 1] : header;
}
