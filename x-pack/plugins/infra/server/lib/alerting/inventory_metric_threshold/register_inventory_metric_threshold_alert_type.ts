/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import {
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
} from './inventory_metric_threshold_executor';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID, Comparator } from './types';
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

const condition = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: oneOfLiterals(Object.values(Comparator)),
  timeUnit: schema.string(),
  timeSize: schema.number(),
  metric: schema.string(),
  customMetric: schema.maybe(
    schema.object({
      type: schema.literal('custom'),
      id: schema.string(),
      field: schema.string(),
      aggregation: schema.string(),
      label: schema.maybe(schema.string()),
    })
  ),
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
      { name: 'group', description: groupActionVariableDescription },
      { name: 'alertState', description: alertStateActionVariableDescription },
      { name: 'reason', description: reasonActionVariableDescription },
      { name: 'timestamp', description: timestampActionVariableDescription },
      { name: 'value', description: valueActionVariableDescription },
      { name: 'metric', description: metricActionVariableDescription },
      { name: 'threshold', description: thresholdActionVariableDescription },
    ],
  },
});
