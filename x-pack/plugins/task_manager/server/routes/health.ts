/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IRouter,
  RequestHandlerContext,
  KibanaRequest,
  IKibanaResponse,
  KibanaResponseFactory,
} from 'kibana/server';
import { Logger } from 'src/core/server';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { throttleTime } from 'rxjs/operators';
import { isString } from 'lodash';
import { MonitoringStats, summarizeMonitoringStats } from '../monitoring';

export function healthRoute(
  router: IRouter,
  monitoringStats: Promise<Observable<MonitoringStats>>,
  logger: Logger,
  requiredFreshness: number
) {
  /* Log Task Manager stats as a Debug log line at a fixed interval */
  monitoringStats.then((monitoringStats$) => {
    monitoringStats$.pipe(throttleTime(requiredFreshness)).subscribe((stats) => {
      logger.debug(JSON.stringify(summarizeMonitoringStats(stats)));
    });
  });

  router.get(
    {
      path: '/api/task_manager/_health',
      validate: false,
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<unknown, unknown, unknown>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse> {
      const stats = await getLatestStats(await monitoringStats);
      const now = Date.now();
      const timestamp = new Date(now).toISOString();

      /**
       * If the monitored stats aren't fresh, return an `500 internalError` with
       * the stats in the body of the api call. This makes it easier for monitoring
       * services to mark the service as broken
       */
      if (
        now -
          getOldestTimestamp(
            stats.lastUpdate,
            stats.stats.runtime?.value.polling.lastSuccessfulPoll
          ) >
        requiredFreshness
      ) {
        return res.internalError({
          body: {
            message: new Error('Task Manager monitored stats are out of date'),
            attributes: { timestamp, ...summarizeMonitoringStats(stats) },
          },
        });
      }
      return res.ok({
        body: { timestamp, ...summarizeMonitoringStats(stats) },
      });
    }
  );
}

function getOldestTimestamp(...timestamps: unknown[]): number {
  return Math.min(
    ...timestamps
      .map((timestamp) => (isString(timestamp) ? Date.parse(timestamp) : NaN))
      .filter((timestamp) => !isNaN(timestamp))
  );
}

async function getLatestStats(monitoringStats$: Observable<MonitoringStats>) {
  return new Promise<MonitoringStats>((resolve) =>
    monitoringStats$.pipe(take(1)).subscribe((stats) => resolve(stats))
  );
}
