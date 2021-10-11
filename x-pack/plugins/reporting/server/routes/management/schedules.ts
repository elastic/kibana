/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';
import { schema } from '@kbn/config-schema';
import { BASE_SCHEDULE, BASE_SCHEDULES } from '../../../common/constants';
import { ReportingCore } from '../../core';
import { reportFromTask } from '../../lib/store';
import { ScheduledReportTaskParams } from '../../lib/tasks';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { handleUnavailable } from '../lib/request_handler';

export function registerScheduleInfoRoutes(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  /*
   * List the user's schedules
   */
  router.get(
    {
      path: `${BASE_SCHEDULES}/list`,
      validate: {
        query: schema.object({}),
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, _req, res) => {
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      // Access the task manager service and query for tasks of type
      // `report:execute` that were created by the current user.
      const { taskManager } = await reporting.getPluginStartDeps();
      const { docs } = await taskManager.fetch({
        size: 100,
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [
                  { term: { 'task.taskType': 'report:execute' } },
                  ...[user ? { term: { 'task.user': user.username } } : undefined],
                ].filter(Boolean) as unknown as QueryDslQueryContainer[],
              },
            },
          },
        },
      });

      const tasks = docs.map((task) => {
        // use the task info, replace the params with Report ApiJSON format
        return {
          ...task,
          params: reportFromTask(task.params as ScheduledReportTaskParams).toApiJSON(),
        };
      });

      return res.ok({
        body: { schedules: tasks },
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  /*
   * WIP Delete a user's schedule
   */
  router.delete(
    {
      path: `${BASE_SCHEDULE}/delete/{scheduleId}`,
      validate: {
        params: schema.object({
          scheduleId: schema.string({ minLength: 3 }),
        }),
      },
    },
    authorizedUserPreRouting(reporting, async (user, context, req, res) => {
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { scheduleId } = req.params;

      const { taskManager } = await reporting.getPluginStartDeps();
      const { docs } = await taskManager.fetch({
        size: 1,
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [
                  { term: { 'task.taskType': 'report:execute' } },
                  { term: { 'task.user': user ? user.username : user } },
                  { term: { _id: `task:${scheduleId}` } },
                ],
              },
            },
          },
        },
      });

      if (docs.length !== 1) {
        return res.notFound();
      }

      let deleted = false;

      try {
        await taskManager.remove(scheduleId);
        deleted = true;
      } catch (err) {
        const { logger } = reporting.getPluginSetupDeps();
        logger.error(err);
      }

      return res.ok({
        body: { deleted },
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );
}
