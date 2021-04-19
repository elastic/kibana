/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { take } from 'rxjs/operators';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { asMutableArray } from '../../../common/utils/as_mutable_array';
import { AlertType, ALERT_TYPES_CONFIG } from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../server/utils/queries';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { createAPMLifecycleRuleType } from './create_apm_lifecycle_rule_type';

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.ErrorCount];

export function registerErrorCountAlertType({
  registry,
  config$,
}: RegisterRuleDependencies) {
  registry.registerType(
    createAPMLifecycleRuleType({
      id: AlertType.ErrorCount,
      name: alertTypeConfig.name,
      actionGroups: alertTypeConfig.actionGroups,
      defaultActionGroupId: alertTypeConfig.defaultActionGroupId,
      validate: {
        params: paramsSchema,
      },
      actionVariables: {
        context: [
          apmActionVariables.serviceName,
          apmActionVariables.environment,
          apmActionVariables.threshold,
          apmActionVariables.triggerValue,
          apmActionVariables.interval,
        ],
      },
      producer: 'apm',
      minimumLicenseRequired: 'basic',
      executor: async ({ services, params }) => {
        const config = await config$.pipe(take(1)).toPromise();
        const alertParams = params;
        const indices = await getApmIndices({
          config,
          savedObjectsClient: services.savedObjectsClient,
        });

        const searchParams = {
          index: indices['apm_oss.errorIndices'],
          size: 0,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: `now-${alertParams.windowSize}${alertParams.windowUnit}`,
                      },
                    },
                  },
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                  ...(alertParams.serviceName
                    ? [{ term: { [SERVICE_NAME]: alertParams.serviceName } }]
                    : []),
                  ...environmentQuery(alertParams.environment),
                ],
              },
            },
            aggs: {
              error_counts: {
                multi_terms: {
                  terms: [
                    { field: SERVICE_NAME },
                    { field: SERVICE_ENVIRONMENT, missing: '' },
                  ],
                  size: 10000,
                },
                aggs: {
                  latest: {
                    top_metrics: {
                      metrics: asMutableArray([
                        { field: SERVICE_NAME },
                        { field: SERVICE_ENVIRONMENT },
                      ] as const),
                      sort: {
                        '@timestamp': 'desc' as const,
                      },
                    },
                  },
                },
              },
            },
          },
        };

        const response = await alertingEsClient({
          scopedClusterClient: services.scopedClusterClient,
          params: searchParams,
        });

        const errorCountResults =
          response.aggregations?.error_counts.buckets.map((bucket) => {
            const latest = bucket.latest.top[0].metrics;

            return {
              serviceName: latest['service.name'] as string,
              environment: latest['service.environment'] as string | undefined,
              errorCount: bucket.doc_count,
            };
          }) ?? [];

        errorCountResults
          .filter((result) => result.errorCount >= alertParams.threshold)
          .forEach((result) => {
            const { serviceName, environment, errorCount } = result;

            services
              .alertWithLifecycle({
                id: [AlertType.ErrorCount, serviceName, environment]
                  .filter((name) => name)
                  .join('_'),
                fields: {
                  [SERVICE_NAME]: serviceName,
                  ...(environment
                    ? { [SERVICE_ENVIRONMENT]: environment }
                    : {}),
                  [PROCESSOR_EVENT]: ProcessorEvent.error,
                  'kibana.observability.evaluation.value': errorCount,
                  'kibana.observability.evaluation.threshold':
                    alertParams.threshold,
                },
              })
              .scheduleActions(alertTypeConfig.defaultActionGroupId, {
                serviceName,
                environment: environment || ENVIRONMENT_NOT_DEFINED.text,
                threshold: alertParams.threshold,
                triggerValue: errorCount,
                interval: `${alertParams.windowSize}${alertParams.windowUnit}`,
              });
          });

        return {};
      },
    })
  );
}
