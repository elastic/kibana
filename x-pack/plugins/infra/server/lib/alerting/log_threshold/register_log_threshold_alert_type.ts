/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import uuid from 'uuid';
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { PluginSetupContract } from '../../../../../alerting/server';
import { createLogThresholdExecutor, FIRED_ACTIONS } from './log_threshold_executor';
import { LOG_THRESHOLD_ALERT_TYPE_ID } from './types';

const sampleActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.sampleActionVariableDescription',
  {
    defaultMessage:
      'Action variables are whatever values you want to make available to messages that this alert sends. This one would replace \\{\\{context.sample\\}\\} in an action message.',
  }
);

export async function registerLogThresholdAlertType(alertingPlugin: PluginSetupContract) {
  if (!alertingPlugin) {
    throw new Error(
      'Cannot register log threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }

  const alertUUID = uuid.v4();

  alertingPlugin.registerType({
    id: LOG_THRESHOLD_ALERT_TYPE_ID,
    name: 'Log threshold',
    validate: {
      params: schema.object({
        threshold: schema.number(),
        comparator: schema.oneOf([schema.literal('>'), schema.literal('>=')]),
        timeUnit: schema.string(),
        timeSize: schema.number(),
      }),
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    executor: createLogThresholdExecutor(alertUUID),
    actionVariables: {
      context: [{ name: 'sample', description: sampleActionVariableDescription }],
    },
  });
}
