/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { IRouter, ServiceStatus, ServiceStatusLevels } from '../../../../../src/core/server';
import { MetricResult } from '../plugin';

const SNAPSHOT_REGEX = /-snapshot/i;

const ServiceStatusToLegacyState: Record<string, string> = {
  [ServiceStatusLevels.critical.toString()]: 'red',
  [ServiceStatusLevels.unavailable.toString()]: 'red',
  [ServiceStatusLevels.degraded.toString()]: 'yellow',
  [ServiceStatusLevels.available.toString()]: 'green',
};

export function registerTaskManagerRoute({
  router,
  config,
  overallStatus$,
  getMetrics,
}: {
  router: IRouter;
  config: {
    allowAnonymous: boolean;
    kibanaIndex: string;
    kibanaVersion: string;
    uuid: string;
    server: {
      name: string;
      hostname: string;
      port: number;
    };
  };
  overallStatus$: Observable<ServiceStatus>;
  getMetrics: () => Promise<MetricResult[] | undefined>;
}) {
  router.get(
    {
      path: '/api/monitoring_collection/task_manager',
      options: {
        // authRequired: !config.allowAnonymous,
        tags: ['api'], // ensures that unauthenticated calls receive a 401 rather than a 302 redirect to login page
      },
      validate: false,
    },
    async (context, req, res) => {
      const taskManager = await getMetrics();
      const overallStatus = await overallStatus$.pipe(first()).toPromise();
      const getClusterUuid = async (): Promise<string> => {
        const { body } = await context.core.elasticsearch.client.asCurrentUser.info({
          filter_path: 'cluster_uuid',
        });
        const { cluster_uuid: uuid } = body;
        return uuid;
      };
      return res.ok({
        body: {
          task_manager: taskManager,
          cluster_uuid: await getClusterUuid(),
          kibana: {
            uuid: config.uuid,
            name: config.server.name,
            index: config.kibanaIndex,
            host: config.server.hostname,
            locale: i18n.getLocale(),
            transport_address: `${config.server.hostname}:${config.server.port}`,
            version: config.kibanaVersion.replace(SNAPSHOT_REGEX, ''),
            snapshot: SNAPSHOT_REGEX.test(config.kibanaVersion),
            status: ServiceStatusToLegacyState[overallStatus.level.toString()],
          },
        },
      });
    }
  );
}
