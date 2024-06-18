/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup as CoreAnalyticsServiceSetup,
  EventTypeOpts,
  Logger,
} from '@kbn/core/server';

import type {
  CSPViolationReport,
  PermissionsPolicyViolationReport,
} from '../routes/analytics/record_violations';

export const AUTHENTICATION_TYPE_EVENT_TYPE = 'security_authentication_type';
export const CSP_VIOLATION_EVENT_TYPE = 'security_csp_violation';
export const PERMISSIONS_POLICY_VIOLATION_EVENT_TYPE = 'security_permissions_policy_violation';

export interface AnalyticsServiceSetupParams {
  analytics: CoreAnalyticsServiceSetup;
}

export interface AnalyticsServiceSetup {
  /**
   * Registers event describing the type of the authentication used to authenticate user's request.
   * @param event Instance of the AuthenticationTypeEvent.
   */
  reportAuthenticationTypeEvent(event: AuthenticationTypeAnalyticsEvent): void;

  /**
   * Registers CSP violation sent by the user's browser using Reporting API.
   * @param event Instance of the AuthenticationTypeEvent.
   */
  reportCSPViolation(event: CSPViolationEvent): void;

  /**
   * Registers CSP violation sent by the user's browser using Reporting API.
   * @param event Instance of the AuthenticationTypeEvent.
   */
  reportPermissionsPolicyViolation(event: PermissionsPolicyViolationEvent): void;
}

/**
 * Interface that represents how CSP violations are stored as EBT events.
 */
export type CSPViolationEvent = FlattenReport<CSPViolationReport>;

/**
 * Interface that represents how permissions policy violations are stored as EBT events.
 */
export type PermissionsPolicyViolationEvent = FlattenReport<PermissionsPolicyViolationReport>;

/**
 * Describes the shape of the authentication type event.
 */
export interface AuthenticationTypeAnalyticsEvent {
  /**
   * Type of the Kibana authentication provider (`basic`, `saml`, `pki` etc.).
   */
  authenticationProviderType: string;

  /**
   * Type of the Elasticsearch security realm (`native`, `ldap`, `file` etc.).
   */
  authenticationRealmType: string;

  /**
   * If user is authenticated using HTTP authentication this field will include
   * HTTP authentication scheme (`Basic`, `Bearer`, `ApiKey` etc.).
   */
  httpAuthenticationScheme?: string;
}

/**
 * Properties that all Reporting API schemas share.
 */
interface CommonReportFields {
  type: string;
  age?: number;
  body: {};
}

/**
 * Helper type that transforms any Reporting API schema into its corresponding EBT schema:
 *
 * - Removes `type` property since events are identified by their `eventType` in EBT.
 * - Replaces `age` property with `created` timestamp so that we capture a fully qualified date.
 * - Spreads `body` property to keep the resulting EBT schema flat.
 */
type FlattenReport<T extends CommonReportFields> = { created: string } & Omit<
  T,
  keyof CommonReportFields
> &
  T['body'];

/**
 * Describes the shape of the CSP violation event type.
 */
const cspViolation: EventTypeOpts<CSPViolationEvent> = {
  eventType: CSP_VIOLATION_EVENT_TYPE,
  schema: {
    created: {
      type: 'keyword',
      _meta: {
        description: 'Timestamp when the violation was captured by the user agent.',
        optional: false,
      },
    },
    url: {
      type: 'keyword',
      _meta: {
        description: '"url" field of W3 Reporting API CSP violation report.',
        optional: false,
      },
    },
    user_agent: {
      type: 'text',
      _meta: {
        description: '"user_agent" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
    documentURL: {
      type: 'text',
      _meta: {
        description: '"documentURL" field of W3 Reporting API CSP violation report.',
        optional: false,
      },
    },
    referrer: {
      type: 'text',
      _meta: {
        description: '"referrer" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
    blockedURL: {
      type: 'text',
      _meta: {
        description: '"blockedURL" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
    effectiveDirective: {
      type: 'text',
      _meta: {
        description: '"effectiveDirective" field of W3 Reporting API CSP violation report.',
        optional: false,
      },
    },
    originalPolicy: {
      type: 'text',
      _meta: {
        description: '"originalPolicy" field of W3 Reporting API CSP violation report.',
        optional: false,
      },
    },
    sourceFile: {
      type: 'text',
      _meta: {
        description: '"sourceFile" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
    sample: {
      type: 'text',
      _meta: {
        description: '"sample" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
    disposition: {
      type: 'text',
      _meta: {
        description: '"disposition" field of W3 Reporting API CSP violation report.',
        optional: false,
      },
    },
    statusCode: {
      type: 'integer',
      _meta: {
        description: '"statusCode" field of W3 Reporting API CSP violation report.',
        optional: false,
      },
    },
    lineNumber: {
      type: 'long',
      _meta: {
        description: '"lineNumber" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
    columnNumber: {
      type: 'long',
      _meta: {
        description: '"columnNumber" field of W3 Reporting API CSP violation report.',
        optional: true,
      },
    },
  },
};

/**
 * Describes the shape of the CSP violation event type.
 */
const permissionsPolicyViolation: EventTypeOpts<PermissionsPolicyViolationEvent> = {
  eventType: PERMISSIONS_POLICY_VIOLATION_EVENT_TYPE,
  schema: {
    created: {
      type: 'keyword',
      _meta: {
        description: 'Timestamp when the violation was captured by the user agent.',
        optional: false,
      },
    },
    url: {
      type: 'keyword',
      _meta: {
        description: '"url" field of Reporting API permissions policy violation report.',
        optional: false,
      },
    },
    user_agent: {
      type: 'text',
      _meta: {
        description: '"user_agent" field of Reporting API permissions policy violation report.',
        optional: true,
      },
    },
    featureId: {
      type: 'text',
      _meta: {
        description: '"featureId" field of Reporting API permissions policy violation report.',
        optional: false,
      },
    },
    sourceFile: {
      type: 'text',
      _meta: {
        description: '"sourceFile" field of Reporting API permissions policy violation report.',
        optional: true,
      },
    },
    lineNumber: {
      type: 'long',
      _meta: {
        description: '"lineNumber" field of Reporting API permissions policy violation report.',
        optional: true,
      },
    },
    columnNumber: {
      type: 'long',
      _meta: {
        description: '"columnNumber" field of Reporting API permissions policy violation report.',
        optional: true,
      },
    },
    disposition: {
      type: 'text',
      _meta: {
        description: '"disposition" field of Reporting API permissions policy violation report.',
        optional: false,
      },
    },
  },
};

/**
 * Service that interacts with the Core's analytics module to collect usage of
 * the various Security plugin features (e.g. type of the authentication used).
 */
export class AnalyticsService {
  constructor(private readonly logger: Logger) {}

  public setup({ analytics }: AnalyticsServiceSetupParams): AnalyticsServiceSetup {
    this.logger.debug(`Registering ${AUTHENTICATION_TYPE_EVENT_TYPE} event type.`);

    analytics.registerEventType({
      eventType: AUTHENTICATION_TYPE_EVENT_TYPE,
      schema: {
        authentication_provider_type: {
          type: 'keyword',
          _meta: {
            description: 'Type of the Kibana authentication provider.',
            optional: false,
          },
        },
        authentication_realm_type: {
          type: 'keyword',
          _meta: {
            description: 'Type of the Elasticsearch security realm.',
            optional: false,
          },
        },
        http_authentication_scheme: {
          type: 'keyword',
          _meta: {
            description:
              'Authentication scheme from the `Authorization` HTTP header, if present in the client request.',
            // The field is populated only if authentication_provider_type === `http`.
            optional: true,
          },
        },
      },
    });

    this.logger.debug(`Registering ${cspViolation.eventType} event type.`);
    analytics.registerEventType(cspViolation);

    this.logger.debug(`Registering ${permissionsPolicyViolation.eventType} event type.`);
    analytics.registerEventType(permissionsPolicyViolation);

    return {
      reportAuthenticationTypeEvent(event: AuthenticationTypeAnalyticsEvent) {
        analytics.reportEvent(AUTHENTICATION_TYPE_EVENT_TYPE, {
          authentication_provider_type: event.authenticationProviderType.toLowerCase(),
          authentication_realm_type: event.authenticationRealmType.toLowerCase(),
          http_authentication_scheme: event.httpAuthenticationScheme?.toLowerCase(),
        });
      },
      reportCSPViolation(event: CSPViolationEvent) {
        analytics.reportEvent(CSP_VIOLATION_EVENT_TYPE, event);
      },
      reportPermissionsPolicyViolation(event: PermissionsPolicyViolationEvent) {
        analytics.reportEvent(PERMISSIONS_POLICY_VIOLATION_EVENT_TYPE, event);
      },
    };
  }
}
