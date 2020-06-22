/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import rison from 'rison-node';
import { schema } from '@kbn/config-schema';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import { HandlerErrorFunction, HandlerFunction } from './types';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';

const BASE_GENERATE = `${API_BASE_URL}/generate`;

export function registerGenerateFromJobParams(
  reporting: ReportingCore,
  handler: HandlerFunction,
  handleError: HandlerErrorFunction
) {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;

  router.post(
    {
      path: `${BASE_GENERATE}/{exportType}`,
      validate: {
        params: schema.object({
          exportType: schema.string({ minLength: 2 }),
        }),
        body: schema.nullable(
          schema.object({
            jobParams: schema.maybe(schema.string()),
          })
        ),
        query: schema.nullable(
          schema.object({
            jobParams: schema.string({
              defaultValue: '',
            }),
          })
        ),
      },
    },
    userHandler(async (user, context, req, res) => {
      let jobParamsRison: string | null;

      if (req.body) {
        const { jobParams: jobParamsPayload } = req.body as { jobParams: string };
        jobParamsRison = jobParamsPayload;
      } else {
        const { jobParams: queryJobParams } = req.query as { jobParams: string };
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

      const { exportType } = req.params as { exportType: string };
      let jobParams;

      try {
        jobParams = rison.decode(jobParamsRison) as object | null;
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

      try {
        return await handler(user, exportType, jobParams, context, req, res);
      } catch (err) {
        return handleError(res, err);
      }
    })
  );

  // Get route to generation endpoint: show error about GET method to user
  router.get(
    {
      path: `${BASE_GENERATE}/{p*}`,
      validate: false,
    },
    (context, req, res) => {
      return res.customError({ statusCode: 405, body: 'GET is not allowed' });
    }
  );
}
