/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { firstValueFrom } from 'rxjs';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { createLifecycleRuleTypeFactory } from '../../../../rule_registry/server';
import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../common/environment_filter_values';
import { getAlertUrlErrorCount } from '../../../common/utils/formatters';
import {
  AlertType,
  APM_SERVER_FEATURE_ID,
  ALERT_TYPES_CONFIG,
  formatErrorCountReason,
} from '../../../common/alert_types';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { ProcessorEvent } from '../../../common/processor_event';
import { environmentQuery } from '../../../common/utils/environment_query';
import { getApmIndices } from '../../routes/settings/apm_indices/get_apm_indices';
import { apmActionVariables } from './action_variables';
import { alertingEsClient } from './alerting_es_client';
import { RegisterRuleDependencies } from './register_apm_alerts';
import { termQuery } from '../../../../observability/server';

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const alertTypeConfig = ALERT_TYPES_CONFIG[AlertType.ErrorCount];

export function registerErrorCountAlertType({
  alerting,
  logger,
  ruleDataClient,
  config$,
  basePath,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  alerting.registerType(
    createLifecycleRuleType({
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
          apmActionVariables.reason,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ services, params }) => {
        const config = await firstValueFrom(config$);
        const ruleParams = params;

        const indices = await getApmIndices({
          config,
          savedObjectsClient: services.savedObjectsClient,
        });
        const searchParams = {
          index: indices.error,
          size: 0,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: `now-${ruleParams.windowSize}${ruleParams.windowUnit}`,
                      },
                    },
                  },
                  { term: { [PROCESSOR_EVENT]: ProcessorEvent.error } },
                  ...termQuery(SERVICE_NAME, ruleParams.serviceName),
                  ...environmentQuery(ruleParams.environment),
                ],
              },
            },
            aggs: {
              error_counts: {
                multi_terms: {
                  terms: [
                    { field: SERVICE_NAME },
                    {
                      field: SERVICE_ENVIRONMENT,
                      missing: ENVIRONMENT_NOT_DEFINED.value,
                    },
                  ],
                  size: 10000,
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
            const [serviceName, environment] = bucket.key;
            return { serviceName, environment, errorCount: bucket.doc_count };
          }) ?? [];

        errorCountResults
          .filter((result) => result.errorCount >= ruleParams.threshold)
          .forEach((result) => {
            const { serviceName, environment, errorCount } = result;
            const alertReason = formatErrorCountReason({
              serviceName,
              threshold: ruleParams.threshold,
              measured: errorCount,
              windowSize: ruleParams.windowSize,
              windowUnit: ruleParams.windowUnit,
            });

            const relativeViewInAppUrl = getAlertUrlErrorCount(
              serviceName,
              getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT]
            );

            const viewInAppUrl = basePath.publicBaseUrl
              ? new URL(
                  basePath.prepend(relativeViewInAppUrl),
                  basePath.publicBaseUrl
                ).toString()
              : relativeViewInAppUrl;

            services
              .alertWithLifecycle({
                id: [AlertType.ErrorCount, serviceName, environment]
                  .filter((name) => name)
                  .join('_'),
                fields: {
                  [SERVICE_NAME]: serviceName,
                  ...getEnvironmentEsField(environment),
                  [PROCESSOR_EVENT]: ProcessorEvent.error,
                  [ALERT_EVALUATION_VALUE]: errorCount,
                  [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                  [ALERT_REASON]: alertReason,
                },
              })
              .scheduleActions(alertTypeConfig.defaultActionGroupId, {
                serviceName,
                environment: getEnvironmentLabel(environment),
                threshold: ruleParams.threshold,
                triggerValue: errorCount,
                interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
                reason: alertReason,
                viewInAppUrl,
              });
          });

        return {};
      },
    })
  );
}
