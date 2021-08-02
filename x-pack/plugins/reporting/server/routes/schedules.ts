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
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import { SchedulesQueryFactory } from './lib/schedules_query';
import { ScheduleIntervalSchema } from '../config';

const MAIN_ENTRY = `${API_BASE_URL}/schedules`;

export function registerSchedulingRoutes(reporting: ReportingCore, logger: LevelLogger) {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;
  const schedulesQuery = new SchedulesQueryFactory(reporting);

  logger.info(`Reistering scheduling routes`);

  router.get(
    {
      path: `${MAIN_ENTRY}/list`,
      validate: {
        query: schema.object({}),
      },
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      return res.ok({
        body: await schedulesQuery.list(req, user),
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // find an existing report to schedule
  router.post(
    {
      path: `${MAIN_ENTRY}/schedule_report_id`,
      validate: {
        body: schema.object({
          report_id: schema.string(),
          schedule: ScheduleIntervalSchema,
          timezone: schema.string(),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { report_id: reportId, schedule, timezone } = req.body;

      return res.ok({
        body: await schedulesQuery.scheduleById(req, user, reportId, schedule, timezone),
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );
}
