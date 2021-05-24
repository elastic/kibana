/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
// @ts-ignore
import { handleError } from '../../../../../lib/errors';
import { RouteDependencies } from '../../../../../types';
// @ts-ignore
import { prefixIndexPattern } from '../../../../../lib/ccs_utils';
import { INDEX_PATTERN_KIBANA } from '../../../../../../common/constants';
// @ts-ignore
import { getMetrics } from '../../../../../lib/details/get_metrics';
// @ts-ignore
import { metrics as kibanaMetrics } from '../../../../../lib/metrics/kibana/metrics';
// @ts-ignore
import { KibanaTaskManagerMetric } from '../../../../../lib/metrics/kibana/classes';
import { getAlertTypes } from '../../../../../lib/kibana/task_manager';
import { getKibanaInfo } from '../../../../../lib/kibana/get_kibana_info';

export function taskManagerInstanceRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/clusters/{clusterUuid}/kibana/{kibanaUuid}/task_manager',
      validate: {
        params: schema.object({
          clusterUuid: schema.string(),
          kibanaUuid: schema.string(),
        }),
        body: schema.object({
          ccs: schema.maybe(schema.string()),
          timeRange: schema.object({
            min: schema.string(),
            max: schema.string(),
          }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const config = server.config();
        const kbnIndexPattern = prefixIndexPattern(config, INDEX_PATTERN_KIBANA, request.body.ccs);
        const legacyRequest = {
          server: {
            config: server.config,
            plugins: {
              elasticsearch: {
                getCluster: (name: string) => ({
                  callWithRequest: async (_req: any, endpoint: string, params: any) => {
                    const client = name === 'monitoring' ? npRoute.cluster : npRoute.esDataClient;
                    return client.asScoped(request).callAsCurrentUser(endpoint, params);
                  },
                }),
              },
            },
          },
          payload: request.body,
          params: request.params,
          getUiSettingsService: () => context.core.uiSettings.client,
        };

        const alertTypes = await getAlertTypes(
          npRoute.cluster.asScoped(request).callAsCurrentUser,
          kbnIndexPattern,
          {
            clusterUuid: request.params.clusterUuid,
            kibanaUuid: request.params.kibanaUuid,
          }
        );

        const knownAlertTypes = context.alerting?.listTypes();
        const knownActionTypes = context.actions?.listTypes();

        const metrics: { [key: string]: any } = {};

        await Promise.all(
          (alertTypes ?? []).map(async (alertType) => {
            const metricSet = [
              {
                keys: [
                  'kibana_task_manager_single_drift_p50',
                  'kibana_task_manager_single_drift_p90',
                  'kibana_task_manager_single_drift_p95',
                  'kibana_task_manager_single_drift_p99',
                ],
                name: 'kibana_task_manager',
              },
            ];
            const filters = [
              {
                nested: {
                  path: 'kibana_stats.task_manager.drift.by_type',
                  query: {
                    term: {
                      'kibana_stats.task_manager.drift.by_type.alert_type': alertType,
                    },
                  },
                },
              },
            ];
            const result = await getMetrics(legacyRequest, kbnIndexPattern, metricSet, filters);
            metrics[`kibana_task_manager_${alertType}`] = result.kibana_task_manager.map(
              (metricResult: any) => {
                const knownIdBasedEntities = [
                  ...(knownAlertTypes ? knownAlertTypes.values() : []),
                  ...(knownActionTypes ? knownActionTypes.values() : []),
                ];
                const knownAlert = knownIdBasedEntities.find(
                  (knownIdBasedEntity) =>
                    `alerting:${knownIdBasedEntity.id}` === alertType ||
                    `actions:${knownIdBasedEntity.id}` === alertType
                );
                return {
                  ...metricResult,
                  metric: {
                    ...metricResult.metric,
                    label: metricResult.metric.label.replace(
                      '[alertType]',
                      knownAlert?.name ?? alertType
                    ),
                    description: metricResult.metric.label.replace(
                      '[alertType]',
                      knownAlert?.name ?? alertType
                    ),
                  },
                };
              }
            );
          })
        );

        const [kibanaSummary] = await Promise.all([
          getKibanaInfo(legacyRequest, kbnIndexPattern, {
            clusterUuid: request.params.clusterUuid,
            kibanaUuid: request.params.kibanaUuid,
          }),
        ]);

        return response.ok({ body: { metrics, alertTypes, kibanaSummary } });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
