/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { URL } from 'url';
import { Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import rison from 'rison-node';
import { BASE_SCHEDULE } from '../../../common/constants';
import { ReportingCore } from '../../core';
import { ScheduleReportFromJobParams } from '../../lib/tasks';
import { BaseParams } from '../../types';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { BadRequestError } from '../lib/errors';
import { handleUnavailable, RequestHandler } from '../lib/request_handler';

export function registerSchedulingRoutes(reporting: ReportingCore, logger: Logger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  /*
   * Create a schedule of a repeating report job
   */
  router.post(
    {
      path: `${BASE_SCHEDULE}/{exportType}`,
      validate: {
        params: schema.object({ exportType: schema.string({ minLength: 2 }) }),
        body: ScheduleReportFromJobParams,
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { post_url: postUrl, interval } = req.body;
      let jobParams: BaseParams | null;

      try {
        const jobParamsRison = new URLSearchParams(new URL(postUrl).searchParams);
        jobParams = rison.decode(jobParamsRison.get('jobParams') ?? '') as typeof jobParams;

        if (!jobParams) {
          return res.customError({
            statusCode: 400,
            body: 'Missing jobParams!',
          });
        }
      } catch (err) {
        logger.error(err);
        return res.customError({
          statusCode: 400,
          body: `invalid rison`,
        });
      }

      const requestHandler = new RequestHandler(reporting, user, context, req, res, logger);
      try {
        // TODO: generate an actual API Key on behalf of the calling user
        const apiKey = { base64: 'okApi123' };

        return requestHandler.handleScheduleRequest(
          req.params.exportType,
          jobParams,
          interval,
          apiKey
        );
      } catch (err) {
        if (err instanceof BadRequestError) {
          return res.badRequest({ body: err });
        }
        logger.error(err);
        return res.customError({
          statusCode: err?.statusCode ?? 500,
          body: { message: err.message },
        });
      }
    })
  );
}
