/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import rison from '@kbn/rison';
import type { ReportingCore } from '../..';
import { API_BASE_URL } from '../../../common/constants';
import type { BaseParams } from '../../types';
import { authorizedUserPreRouting, getCounters, RequestHandler } from '../lib';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerJobGenerationRoutes(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  // TODO: find a way to abstract this using ExportTypeRegistry: it needs a new
  // public method to return this array
  // const registry = reporting.getExportTypesRegistry();
  // const kibanaAccessControlTags = registry.getAllAccessControlTags();
  const useKibanaAccessControl = reporting.getDeprecatedAllowedRoles() === false; // true if Reporting's deprecated access control feature is disabled
  const kibanaAccessControlTags = useKibanaAccessControl ? ['access:generateReport'] : [];

  const registerPostGenerationEndpoint = () => {
    const path = `${BASE_GENERATE}/{exportType}`;
    router.post(
      {
        path,
        validate: {
          params: schema.object({ exportType: schema.string({ minLength: 2 }) }),
          body: schema.nullable(schema.object({ jobParams: schema.maybe(schema.string()) })),
          query: schema.nullable(schema.object({ jobParams: schema.string({ defaultValue: '' }) })),
        },
        options: { tags: kibanaAccessControlTags },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(
          req.route.method,
          path.replace(/{exportType}/, req.params.exportType),
          reporting.getUsageCounter()
        );

        let jobParamsRison: null | string = null;

        if (req.body) {
          const { jobParams: jobParamsPayload } = req.body;
          jobParamsRison = jobParamsPayload ? jobParamsPayload : null;
        } else if (req.query?.jobParams) {
          const { jobParams: queryJobParams } = req.query;
          if (queryJobParams) {
            jobParamsRison = queryJobParams;
          } else {
            jobParamsRison = null;
          }
        }

        if (!jobParamsRison) {
          return res.customError({
            statusCode: 400,
            body: 'A jobParams RISON string is required in the querystring or POST body',
          });
        }

        let jobParams;

        try {
          jobParams = rison.decode(jobParamsRison) as BaseParams | null;
          if (!jobParams) {
            return res.customError({
              statusCode: 400,
              body: 'Missing jobParams!',
            });
          }
        } catch (err) {
          return res.customError({
            statusCode: 400,
            body: `invalid rison: ${jobParamsRison}`,
          });
        }

        const requestHandler = new RequestHandler(reporting, user, context, req, res, logger);
        return await requestHandler.handleGenerateRequest(
          req.params.exportType,
          jobParams,
          counters
        );
      })
    );
  };

  const registerGetGenerationEndpoint = () => {
    // Get route to generation endpoint: show error about GET method to user
    router.get(
      {
        path: `${BASE_GENERATE}/{p*}`,
        validate: false,
      },
      (_context, _req, res) => {
        return res.customError({ statusCode: 405, body: 'GET is not allowed' });
      }
    );
  };

  registerPostGenerationEndpoint();
  registerGetGenerationEndpoint();
}
