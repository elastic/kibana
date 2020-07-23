/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import {
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
} from './inventory_metric_threshold_executor';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID, Comparator } from './types';
import { InfraBackendLibs } from '../../infra_types';
import { oneOfLiterals, validateIsStringElasticsearchJSONFilter } from '../common/utils';

const condition = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(Object.values(Comparator)),
  timeUnit: schema.string(),
  timeSize: schema.number(),
  metric: schema.string(),
});

export const registerMetricInventoryThresholdAlertType = (libs: InfraBackendLibs) => ({
  id: METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID,
  name: 'Inventory',
  validate: {
    params: schema.object(
      {
        criteria: schema.arrayOf(condition),
        nodeType: schema.string(),
        filterQuery: schema.maybe(
          schema.string({ validate: validateIsStringElasticsearchJSONFilter })
        ),
        sourceId: schema.string(),
        alertOnNoData: schema.maybe(schema.boolean()),
      },
      { unknowns: 'allow' }
    ),
  },
  defaultActionGroupId: FIRED_ACTIONS.id,
  actionGroups: [FIRED_ACTIONS],
  producer: 'infrastructure',
  executor: createInventoryMetricThresholdExecutor(libs),
  actionVariables: {
    context: [
      {
        name: 'group',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.groupActionVariableDescription',
          {
            defaultMessage: 'Name of the group reporting data',
          }
        ),
      },
      {
        name: 'value',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.valueActionVariableDescription',
          {
            defaultMessage:
              'Record of the current value of the watched metric; grouped by condition, i.e value.condition0, value.condition1, etc.',
          }
        ),
      },
      {
        name: 'threshold',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.thresholdActionVariableDescription',
          {
            defaultMessage:
              'Record of the alerting threshold; grouped by condition, i.e threshold.condition0, threshold.condition1, etc.',
          }
        ),
      },
      {
        name: 'metric',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.metricActionVariableDescription',
          {
            defaultMessage:
              'Record of the watched metric; grouped by condition, i.e metric.condition0, metric.condition1, etc.',
          }
        ),
      },
    ],
  },
});
