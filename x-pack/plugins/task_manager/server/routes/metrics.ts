/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from '@kbn/core/server';
import { Observable } from 'rxjs';
import { Metrics } from '../metrics';

export interface NodeMetrics {
  process_uuid: string;
  timestamp: string;
  last_update: string;
  metrics: Metrics['metrics'] | null;
}

export interface MetricsRouteParams {
  router: IRouter;
  metrics$: Observable<Metrics>;
  taskManagerId: string;
}

export function metricsRoute(params: MetricsRouteParams) {
  const { router, metrics$, taskManagerId } = params;

  let lastMetrics: NodeMetrics | null = null;

  metrics$.subscribe((metrics) => {
    lastMetrics = { process_uuid: taskManagerId, timestamp: new Date().toISOString(), ...metrics };
  });

  router.get(
    {
      path: `/api/task_manager/metrics`,
      // Uncomment when we determine that we can restrict API usage to Global admins based on telemetry
      // options: { tags: ['access:taskManager'] },
      validate: false,
    },
    async function (
      _: RequestHandlerContext,
      __: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      return res.ok({
        body: lastMetrics
          ? lastMetrics
          : { process_uuid: taskManagerId, timestamp: new Date().toISOString(), metrics: {} },
      });
    }
  );
}
