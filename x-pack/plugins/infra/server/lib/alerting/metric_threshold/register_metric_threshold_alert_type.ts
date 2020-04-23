/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { PluginSetupContract } from '../../../../../alerting/server';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../common/http_api/metrics_explorer';
import { createMetricThresholdExecutor, FIRED_ACTIONS } from './metric_threshold_executor';
import { METRIC_THRESHOLD_ALERT_TYPE_ID, Comparator } from './types';

const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>
  schema.string({
    validate: value =>
      arrayOfLiterals.includes(value) ? undefined : `must be one of ${arrayOfLiterals.join(' | ')}`,
  });

export async function registerMetricThresholdAlertType(alertingPlugin: PluginSetupContract) {
  if (!alertingPlugin) {
    throw new Error(
      'Cannot register metric threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }
  const alertUUID = uuid.v4();

  const baseCriterion = {
    threshold: schema.arrayOf(schema.number()),
    comparator: oneOfLiterals(Object.values(Comparator)),
    timeUnit: schema.string(),
    timeSize: schema.number(),
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

  const groupActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.groupActionVariableDescription',
    {
      defaultMessage: 'Name of the group reporting data',
    }
  );

  const alertStateActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.alertStateActionVariableDescription',
    {
      defaultMessage: 'Current state of the alert',
    }
  );

  const reasonActionVariableDescription = i18n.translate(
    'xpack.infra.metrics.alerting.threshold.alerting.reasonActionVariableDescription',
    {
      defaultMessage:
        'A description of why the alert is in this state, including which metrics have crossed which thresholds',
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
        alertOnNoData: schema.boolean(),
      }),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    executor: createMetricThresholdExecutor(alertUUID),
    actionVariables: {
      context: [
        { name: 'group', description: groupActionVariableDescription },
        { name: 'alertState', description: alertStateActionVariableDescription },
        { name: 'reason', description: reasonActionVariableDescription },
      ],
    },
  });
}
