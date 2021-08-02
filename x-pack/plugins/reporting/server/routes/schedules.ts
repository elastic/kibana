/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { handleUnavailable } from '.';
import { API_BASE_URL } from '../../common/constants';
import { ReportingCore } from '../core';
import { LevelLogger } from '../lib';
import { ScheduleReportByIdSchema } from '../lib/tasks';
import { authorizedUserPreRouting } from './lib/authorized_user_pre_routing';
import { BadRequestError } from './lib/errors';
import { scheduleReportById } from './lib/schedule_by_id';

const MAIN_ENTRY = `${API_BASE_URL}/schedules`;

export function registerSchedulingRoutes(reporting: ReportingCore, logger: LevelLogger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  router.get(
    {
      path: `${MAIN_ENTRY}/list`,
      validate: {
        query: schema.object({}),
      },
    },
    authorizedUserPreRouting(reporting, async (_user, context, _req, res) => {
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      return res.ok({
        body: [],
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // make a schedule from an existing report
  router.post(
    {
      path: `${MAIN_ENTRY}/schedule_report_id`,
      validate: {
        body: ScheduleReportByIdSchema,
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      try {
        return res.ok({
          body: await scheduleReportById(reporting, req, user),
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (err) {
        if (err instanceof BadRequestError) {
          return res.badRequest({ body: err });
        }
        logger.error(err);
        throw err;
      }
    })
  );
}
