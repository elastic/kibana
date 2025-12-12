/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

export function initRoutes(router: IRouter, taskManagerStart: Promise<TaskManagerStartContract>) {
  router.post(
    {
      path: `/api/reporting_fixture_telemetry/run_soon`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization because it is only used in tests',
        },
      },
      validate: {
        body: schema.object({
          taskId: schema.string({
            validate: (telemetryTaskId: string) => {
              if (telemetryTaskId === 'Reporting-reporting_telemetry') {
                return;
              }
              return 'invalid telemetry task id';
            },
          }),
        }),
      },
    },
    async function (
      _: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const { taskId } = req.body;

      try {
        const taskManager = await taskManagerStart;
        return res.ok({ body: await taskManager.runSoon(taskId) });
      } catch (err) {
        return res.ok({ body: { id: taskId, error: `${err}` } });
      }
    }
  );
}
