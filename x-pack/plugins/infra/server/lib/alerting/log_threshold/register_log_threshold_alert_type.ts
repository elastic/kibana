/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { PluginSetupContract } from '../../../../../alerts/server';
import { createLogThresholdExecutor, FIRED_ACTIONS } from './log_threshold_executor';
import {
  LOG_DOCUMENT_COUNT_ALERT_TYPE_ID,
  AlertParamsRT,
} from '../../../../common/alerting/logs/log_threshold/types';
import { InfraBackendLibs } from '../../infra_types';
import { decodeOrThrow } from '../../../../common/runtime_types';

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
      params: {
        validate: (params) => decodeOrThrow(AlertParamsRT)(params),
      },
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
