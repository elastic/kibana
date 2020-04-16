/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { PluginSetupContract } from '../../../../../alerting/server';
import { createMetricThresholdExecutor, FIRED_ACTIONS } from './metric_threshold_executor';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from './types';

export async function registerMetricThresholdAlertType(alertingPlugin: PluginSetupContract) {
  if (!alertingPlugin) {
    throw new Error(
      'Cannot register metric threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }
  const alertUUID = uuid.v4();

  const baseCriterion = {
    threshold: schema.arrayOf(schema.number()),
    comparator: schema.oneOf([
      schema.literal('>'),
      schema.literal('<'),
      schema.literal('>='),
      schema.literal('<='),
      schema.literal('between'),
    ]),
    timeUnit: schema.string(),
    timeSize: schema.number(),
  };

  const nonCountCriterion = schema.object({
    ...baseCriterion,
    metric: schema.string(),
    aggType: schema.oneOf([
      schema.literal('avg'),
      schema.literal('min'),
      schema.literal('max'),
      schema.literal('rate'),
      schema.literal('cardinality'),
    ]),
  });

  const countCriterion = schema.object({
    ...baseCriterion,
    aggType: schema.literal('count'),
    metric: schema.never(),
  });

  const groupActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.groupActionVariableDescription',
    {
      defaultMessage: 'Name of the group reporting data',
    }
  );

  const valueOfActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.valueOfActionVariableDescription',
    {
      defaultMessage:
        'Record of the current value of the watched metric; grouped by condition, i.e valueOf.condition0, valueOf.condition1, etc.',
    }
  );

  const thresholdOfActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.thresholdOfActionVariableDescription',
    {
      defaultMessage:
        'Record of the alerting threshold; grouped by condition, i.e thresholdOf.condition0, thresholdOf.condition1, etc.',
    }
  );

  const metricOfActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.metricOfActionVariableDescription',
    {
      defaultMessage:
        'Record of the watched metric; grouped by condition, i.e metricOf.condition0, metricOf.condition1, etc.',
    }
  );

  alertingPlugin.registerType({
    id: METRIC_THRESHOLD_ALERT_TYPE_ID,
    name: 'Metric threshold',
    validate: {
      params: schema.object({
        criteria: schema.arrayOf(schema.oneOf([countCriterion, nonCountCriterion])),
        groupBy: schema.maybe(schema.string()),
        filterQuery: schema.maybe(schema.string()),
        sourceId: schema.string(),
      }),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    executor: createMetricThresholdExecutor(alertUUID),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'valueOf', description: valueOfActionVariableDescription },
        { name: 'thresholdOf', description: thresholdOfActionVariableDescription },
        { name: 'metricOf', description: metricOfActionVariableDescription },
      ],
    },
  });
}
