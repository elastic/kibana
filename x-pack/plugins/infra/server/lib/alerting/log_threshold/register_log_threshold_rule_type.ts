/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import { createLogThresholdExecutor, FIRED_ACTIONS } from './log_threshold_executor';
import {
  LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
  ruleParamsRT,
} from '../../../../common/alerting/logs/log_threshold';
import { InfraBackendLibs } from '../../infra_types';
import { decodeOrThrow } from '../../../../common/runtime_types';

const timestampActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.timestampActionVariableDescription',
  {
    defaultMessage: 'UTC timestamp of when the alert was triggered',
  }
);

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

const isRatioActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.isRatioActionVariableDescription',
  {
    defaultMessage: 'Denotes whether this alert was configured with a ratio',
  }
);

const ratioActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.ratioActionVariableDescription',
  {
    defaultMessage: 'The ratio value of the two sets of criteria',
  }
);

const numeratorConditionsActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.numeratorConditionsActionVariableDescription',
  {
    defaultMessage: 'The conditions that the numerator of the ratio needed to fulfill',
  }
);

const denominatorConditionsActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.denominatorConditionsActionVariableDescription',
  {
    defaultMessage: 'The conditions that the denominator of the ratio needed to fulfill',
  }
);

const alertReasonMessageActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.alertReasonMessageActionVariableDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);

const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.infra.logs.alerting.threshold.viewInAppUrlActionVariableDescription',
  {
    defaultMessage:
      'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
  }
);

export async function registerLogThresholdRuleType(
  alertingPlugin: PluginSetupContract,
  libs: InfraBackendLibs
) {
  if (!alertingPlugin) {
    throw new Error(
      'Cannot register log threshold alert type.  Both the actions and alerting plugins need to be enabled.'
    );
  }

  alertingPlugin.registerType({
    id: LOG_DOCUMENT_COUNT_RULE_TYPE_ID,
    name: i18n.translate('xpack.infra.logs.alertName', {
      defaultMessage: 'Log threshold',
    }),
    validate: {
      params: {
        validate: (params) => decodeOrThrow(ruleParamsRT)(params),
      },
    },
    defaultActionGroupId: FIRED_ACTIONS.id,
    actionGroups: [FIRED_ACTIONS],
    minimumLicenseRequired: 'basic',
    isExportable: true,
    executor: createLogThresholdExecutor(libs),
    actionVariables: {
      context: [
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'matchingDocuments', description: documentCountActionVariableDescription },
        { name: 'conditions', description: conditionsActionVariableDescription },
        { name: 'group', description: groupByActionVariableDescription },
        // Ratio alerts
        { name: 'isRatio', description: isRatioActionVariableDescription },
        { name: 'reason', description: alertReasonMessageActionVariableDescription },
        { name: 'ratio', description: ratioActionVariableDescription },
        { name: 'numeratorConditions', description: numeratorConditionsActionVariableDescription },
        {
          name: 'denominatorConditions',
          description: denominatorConditionsActionVariableDescription,
        },
        {
          name: 'viewInAppUrl',
          description: viewInAppUrlActionVariableDescription,
        },
      ],
    },
    producer: 'logs',
  });
}
