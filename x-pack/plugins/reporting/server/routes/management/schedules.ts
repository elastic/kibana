/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { API_BASE_URL } from '../../../common/constants';
import { ReportingCore } from '../../core';
import { reportFromTask } from '../../lib/store';
import { ScheduledReportTaskParams } from '../../lib/tasks';
import { authorizedUserPreRouting } from '../lib/authorized_user_pre_routing';
import { handleUnavailable } from '../lib/request_handler';

// TODO: move this to constants file - will eventually be needed in the UI
const BASE_SCHEDULE = `${API_BASE_URL}/schedules`;

export function registerScheduleInfoRoutes(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;

  /*
   * List the user's schedules
   */
  router.get(
    {
      path: `${BASE_SCHEDULE}/list`,
      validate: {
        query: schema.object({}),
      },
    },
    authorizedUserPreRouting(reporting, async (_user, context, _req, res) => {
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      // Access the task manager service and query for tasks of type
      // `report:execute` that were created by the current user.
      const { taskManager } = await reporting.getPluginStartDeps();
      const { docs } = await taskManager.fetch({
        size: 100,
        query: { constant_score: { filter: { term: { 'task.taskType': 'report:execute' } } } },
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
}
