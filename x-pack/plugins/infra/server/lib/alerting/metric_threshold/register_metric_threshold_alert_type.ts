/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  AlertType,
  AlertInstanceState,
  AlertInstanceContext,
  AlertExecutorOptions,
  ActionGroupIdsOf,
} from '../../../../../alerts/server';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../common/http_api/metrics_explorer';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  WARNING_ACTIONS,
} from './metric_threshold_executor';
import { METRIC_THRESHOLD_ALERT_TYPE_ID, Comparator } from './types';
import { InfraBackendLibs } from '../../infra_types';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';
import {
  groupActionVariableDescription,
  alertStateActionVariableDescription,
  reasonActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
  metricActionVariableDescription,
  thresholdActionVariableDescription,
} from '../common/messages';

export type MetricThresholdAlertType = AlertType<
  /**
   * TODO: Remove this use of `any` by utilizing a proper type
   */
  Record<string, any>,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  ActionGroupIdsOf<typeof FIRED_ACTIONS | typeof WARNING_ACTIONS>
>;
export type MetricThresholdAlertExecutorOptions = AlertExecutorOptions<
  /**
   * TODO: Remove this use of `any` by utilizing a proper type
   */
  Record<string, any>,
  Record<string, any>,
  AlertInstanceState,
  AlertInstanceContext,
  ActionGroupIdsOf<typeof FIRED_ACTIONS | typeof WARNING_ACTIONS>
>;

export function registerMetricThresholdAlertType(libs: InfraBackendLibs): MetricThresholdAlertType {
  const baseCriterion = {
    threshold: schema.arrayOf(schema.number()),
    comparator: oneOfLiterals(Object.values(Comparator)),
    timeUnit: schema.string(),
    timeSize: schema.number(),
    warningThreshold: schema.maybe(schema.arrayOf(schema.number())),
    warningComparator: schema.maybe(oneOfLiterals(Object.values(Comparator))),
  };

  const nonCountCriterion = schema.object({
    ...baseCriterion,
    metric: schema.string(),
    aggType: oneOfLiterals(METRIC_EXPLORER_AGGREGATIONS),
  });

  const countCriterion = schema.object({
    ...baseCriterion,
    aggType: schema.literal('count'),
    metric: schema.never(),
  });

  return {
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: i18n.translate('xpack.infra.metrics.alertName', {
      defaultMessage: 'Metric threshold',
    }),
    validate: {
      params: schema.object(
        {
          criteria: schema.arrayOf(schema.oneOf([countCriterion, nonCountCriterion])),
          groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filterQuery: schema.maybe(
            schema.string({
              validate: validateIsStringElasticsearchJSONFilter,
            })
          ),
          sourceId: schema.string(),
          alertOnNoData: schema.maybe(schema.boolean()),
        },
        { unknowns: 'allow' }
      ),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS, WARNING_ACTIONS],
    minimumLicenseRequired: 'basic',
    executor: createMetricThresholdExecutor(libs),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'alertState', description: alertStateActionVariableDescription },
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'metric', description: metricActionVariableDescription },
        { name: 'threshold', description: thresholdActionVariableDescription },
      ],
    },
    producer: 'infrastructure',
  };
}
