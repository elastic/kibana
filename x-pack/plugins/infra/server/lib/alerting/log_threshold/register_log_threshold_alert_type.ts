/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { PluginSetupContract } from '../../../../../alerts/server';
import { createLogThresholdExecutor, FIRED_ACTIONS } from './log_threshold_executor';
import {
  LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
  Comparator,
} from '../../../../common/alerting/logs/types';
import { InfraBackendLibs } from '../../infra_types';

const documentCountActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.documentCountActionVariableDescription',
  {
    defaultMessage: 'The number of log entries that matched the conditions provided',
  }
);

const conditionsActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.conditionsActionVariableDescription',
  {
    defaultMessage: 'The conditions that log entries needed to fulfill',
  }
);

const groupByActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.groupByActionVariableDescription',
  {
    defaultMessage: 'The name of the group responsible for triggering the alert',
  }
);

const countSchema = schema.object({
  value: schema.number(),
  comparator: schema.oneOf([
    schema.literal(Comparator.GT),
    schema.literal(Comparator.LT),
    schema.literal(Comparator.GT_OR_EQ),
    schema.literal(Comparator.LT_OR_EQ),
    schema.literal(Comparator.EQ),
  ]),
});

const criteriaSchema = schema.object({
  field: schema.string(),
  comparator: schema.oneOf([
    schema.literal(Comparator.GT),
    schema.literal(Comparator.LT),
    schema.literal(Comparator.GT_OR_EQ),
    schema.literal(Comparator.LT_OR_EQ),
    schema.literal(Comparator.EQ),
    schema.literal(Comparator.NOT_EQ),
    schema.literal(Comparator.MATCH),
    schema.literal(Comparator.NOT_MATCH),
  ]),
  value: schema.oneOf([schema.number(), schema.string()]),
});

export async function registerLogThresholdAlertType(
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs
) {
  if (!alertingPlugin) {
    throw new Error(
      'Cannot register log threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }

  alertingPlugin.registerType({
    id: LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
    name: 'Log threshold',
    validate: {
      params: schema.object({
        count: countSchema,
        criteria: schema.arrayOf(criteriaSchema),
        timeUnit: schema.string(),
        timeSize: schema.number(),
        groupBy: schema.maybe(schema.arrayOf(schema.string())),
      }),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    executor: createLogThresholdExecutor(libs),
    actionVariables: {
      context: [
        { name: 'matchingDocuments', description: documentCountActionVariableDescription },
        { name: 'conditions', description: conditionsActionVariableDescription },
        { name: 'group', description: groupByActionVariableDescription },
      ],
    },
    producer: 'logs',
  });
}
