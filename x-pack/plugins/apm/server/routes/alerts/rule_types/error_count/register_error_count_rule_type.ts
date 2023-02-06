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
import { createLifecycleRuleTypeFactory } from '@kbn/rule-registry-plugin/server';
import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { getAlertDetailsUrl } from '@kbn/infra-plugin/server/lib/alerting/common/utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/common';

import {
  ENVIRONMENT_NOT_DEFINED,
  getEnvironmentEsField,
  getEnvironmentLabel,
} from '../../../../../common/environment_filter_values';
import { getAlertUrlErrorCount } from '../../../../../common/utils/formatters';
import {
  ApmRuleType,
  APM_SERVER_FEATURE_ID,
  RULE_TYPES_CONFIG,
  formatErrorCountReason,
} from '../../../../../common/rules/apm_rule_types';
import {
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../../common/utils/environment_query';
import { getApmIndices } from '../../../settings/apm_indices/get_apm_indices';
import { apmActionVariables } from '../../action_variables';
import { alertingEsClient } from '../../alerting_es_client';
import { RegisterRuleDependencies } from '../../register_apm_rule_types';
import {
  getServiceGroupFieldsAgg,
  getServiceGroupFields,
} from '../get_service_group_fields';

const paramsSchema = schema.object({
  windowSize: schema.number(),
  windowUnit: schema.string(),
  threshold: schema.number(),
  serviceName: schema.maybe(schema.string()),
  environment: schema.string(),
});

const ruleTypeConfig = RULE_TYPES_CONFIG[ApmRuleType.ErrorCount];

export function registerErrorCountRuleType({
  alerting,
  basePath,
  config$,
  logger,
  observability,
  ruleDataClient,
}: RegisterRuleDependencies) {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger,
  });

  alerting.registerType(
    createLifecycleRuleType({
      id: ApmRuleType.ErrorCount,
      name: ruleTypeConfig.name,
      actionGroups: ruleTypeConfig.actionGroups,
      defaultActionGroupId: ruleTypeConfig.defaultActionGroupId,
      validate: {
        params: paramsSchema,
      },
      actionVariables: {
        context: [
          ...(observability.getAlertDetailsConfig()?.apm.enabled
            ? [apmActionVariables.alertDetailsUrl]
            : []),
          apmActionVariables.environment,
          apmActionVariables.interval,
          apmActionVariables.reason,
          apmActionVariables.serviceName,
          apmActionVariables.threshold,
          apmActionVariables.triggerValue,
          apmActionVariables.viewInAppUrl,
        ],
      },
      producer: APM_SERVER_FEATURE_ID,
      minimumLicenseRequired: 'basic',
      isExportable: true,
      executor: async ({ params: ruleParams, services, spaceId }) => {
        const config = await firstValueFrom(config$);

        const { getAlertUuid, savedObjectsClient, scopedClusterClient } =
          services;

        const indices = await getApmIndices({
          config,
          savedObjectsClient,
        });

        const searchParams = {
          index: indices.error,
          body: {
            track_total_hits: false,
            size: 0,
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
                  ...termQuery(SERVICE_NAME, ruleParams.serviceName, {
                    queryEmptyString: false,
                  }),
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
                  size: 1000,
                  order: { _count: 'desc' as const },
                },
                aggs: getServiceGroupFieldsAgg(),
              },
            },
          },
        };

        const response = await alertingEsClient({
          scopedClusterClient,
          params: searchParams,
        });

        const errorCountResults =
          response.aggregations?.error_counts.buckets.map((bucket) => {
            const [serviceName, environment] = bucket.key;
            return {
              serviceName,
              environment,
              errorCount: bucket.doc_count,
              sourceFields: getServiceGroupFields(bucket),
            };
          }) ?? [];

        errorCountResults
          .filter((result) => result.errorCount >= ruleParams.threshold)
          .forEach((result) => {
            const { serviceName, environment, errorCount, sourceFields } =
              result;
            const alertReason = formatErrorCountReason({
              serviceName,
              threshold: ruleParams.threshold,
              measured: errorCount,
              windowSize: ruleParams.windowSize,
              windowUnit: ruleParams.windowUnit,
            });

            const id = [ApmRuleType.ErrorCount, serviceName, environment]
              .filter((name) => name)
              .join('_');

            const relativeViewInAppUrl = getAlertUrlErrorCount(
              serviceName,
              getEnvironmentEsField(environment)?.[SERVICE_ENVIRONMENT]
            );

            const viewInAppUrl = addSpaceIdToPath(
              basePath.publicBaseUrl,
              spaceId,
              relativeViewInAppUrl
            );

            const alertUuid = getAlertUuid(id);
            const alertDetailsUrl = getAlertDetailsUrl(
              basePath,
              spaceId,
              alertUuid
            );

            services
              .alertWithLifecycle({
                id,
                fields: {
                  [SERVICE_NAME]: serviceName,
                  ...getEnvironmentEsField(environment),
                  [PROCESSOR_EVENT]: ProcessorEvent.error,
                  [ALERT_EVALUATION_VALUE]: errorCount,
                  [ALERT_EVALUATION_THRESHOLD]: ruleParams.threshold,
                  [ALERT_REASON]: alertReason,
                  ...sourceFields,
                },
              })
              .scheduleActions(ruleTypeConfig.defaultActionGroupId, {
                alertDetailsUrl,
                environment: getEnvironmentLabel(environment),
                interval: `${ruleParams.windowSize}${ruleParams.windowUnit}`,
                reason: alertReason,
                serviceName,
                threshold: ruleParams.threshold,
                triggerValue: errorCount,
                viewInAppUrl,
              });
          });

        return { state: {} };
      },
    })
  );
}
