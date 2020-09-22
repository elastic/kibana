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
import { pick } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { JsonObject } from 'src/plugins/kibana_utils/common';
import { map } from 'rxjs/operators';
import { TaskManagerConfig } from '../config';
import { AggregatedStatProvider } from '../monitoring';

const CONFIG_FIELDS_TO_EXPOSE = [
  'max_workers',
  'poll_interval',
  'request_capacity',
  'max_poll_inactivity_cycles',
  'monitored_aggregated_stats_refresh_rate',
];

interface MonitoredStat {
  timestamp: string;
  value: JsonObject;
}

interface MonitoringStats {
  lastUpdate: string;
  stats: Record<string, MonitoredStat>;
}

export function healthRoute(
  router: IRouter,
  initialConfig: TaskManagerConfig,
  aggregatedStats: Promise<AggregatedStatProvider>,
  requiredFreshness: number
) {
  const initialisationTimestamp = new Date().toISOString();
  const monitoringStats: MonitoringStats = {
    lastUpdate: initialisationTimestamp,
    stats: {
      configuration: {
        timestamp: initialisationTimestamp,
        value: pick<{
          max_workers: number;
          poll_interval: number;
          request_capacity: number;
          max_poll_inactivity_cycles: number;
          monitored_aggregated_stats_refresh_rate: number;
        }>(initialConfig, ...CONFIG_FIELDS_TO_EXPOSE) as JsonObject,
      },
    },
  };

  aggregatedStats.then((aggregatedStats$) => {
    aggregatedStats$
      .pipe(
        map(({ key, value }) => {
          return {
            value: { timestamp: new Date().toISOString(), value },
            key,
          };
        })
      )
      .subscribe(({ key, value }) => {
        set(monitoringStats.stats, key, value);
        monitoringStats.lastUpdate = new Date().toISOString();
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
      const lastUpdate = Date.parse(monitoringStats.lastUpdate);

      /**
       * If the monitored stats aren't fresh, return an `500 internalError` with
       * the stats in the body of the api call. This makes it easier for monitoring
       * services to mark the service as broken
       */
      if (Date.now() - lastUpdate > requiredFreshness) {
        return res.internalError({
          body: {
            message: new Error('Task Manager monitored stats are out of date'),
            attributes: monitoringStats,
          },
        });
      }
      return res.ok({
        body: monitoringStats,
      });
    }
  );
}
