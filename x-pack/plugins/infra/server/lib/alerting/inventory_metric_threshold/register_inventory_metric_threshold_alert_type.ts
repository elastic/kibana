/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { curry } from 'lodash';
import uuid from 'uuid';
import {
  createInventoryMetricThresholdExecutor,
  FIRED_ACTIONS,
} from './inventory_metric_threshold_executor';
import { METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID } from './types';
import { InfraBackendLibs } from '../../infra_types';

const condition = schema.object({
  threshold: schema.arrayOf(schema.number()),
  comparator: schema.oneOf([
    schema.literal('>'),
    schema.literal('<'),
    schema.literal('>='),
    schema.literal('<='),
    schema.literal('between'),
    schema.literal('outside'),
  ]),
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
        filterQuery: schema.maybe(schema.string()),
        sourceId: schema.string(),
      },
      { unknowns: 'allow' }
    ),
  },
  defaultActionGroupId: FIRED_ACTIONS.id,
  actionGroups: [FIRED_ACTIONS],
  executor: curry(createInventoryMetricThresholdExecutor)(libs, uuid.v4()),
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
        name: 'valueOf',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.valueOfActionVariableDescription',
          {
            defaultMessage:
              'Record of the current value of the watched metric; grouped by condition, i.e valueOf.condition0, valueOf.condition1, etc.',
          }
        ),
      },
      {
        name: 'thresholdOf',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.thresholdOfActionVariableDescription',
          {
            defaultMessage:
              'Record of the alerting threshold; grouped by condition, i.e thresholdOf.condition0, thresholdOf.condition1, etc.',
          }
        ),
      },
      {
        name: 'metricOf',
        description: i18n.translate(
          'xpack.infra.metrics.alerting.threshold.alerting.metricOfActionVariableDescription',
          {
            defaultMessage:
              'Record of the watched metric; grouped by condition, i.e metricOf.condition0, metricOf.condition1, etc.',
          }
        ),
      },
    ],
  },
});
