/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UptimeCorePluginsSetup } from '../legacy_uptime/lib/adapters';
import { commonMonitorStateI18, commonStateTranslations } from './translations';

export const MESSAGE = 'message';
export const ALERT_REASON_MSG = 'reason';
export const ALERT_DETAILS_URL = 'alertDetailsUrl';
export const VIEW_IN_APP_URL = 'viewInAppUrl';
export const RECOVERY_REASON = 'recoveryReason';

export const getActionVariables = ({ plugins }: { plugins: UptimeCorePluginsSetup }) => {
  return {
    context: [
      ACTION_VARIABLES[MESSAGE],
      ...(plugins.observability.getAlertDetailsConfig()?.uptime.enabled
        ? [ACTION_VARIABLES[ALERT_DETAILS_URL]]
        : []),
      ACTION_VARIABLES[ALERT_REASON_MSG],
      ACTION_VARIABLES[VIEW_IN_APP_URL],
      ACTION_VARIABLES[RECOVERY_REASON],
      ...commonMonitorStateI18,
    ],
    state: [...commonStateTranslations],
  };
};

export const ACTION_VARIABLES = {
  [MESSAGE]: {
    name: MESSAGE,
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.context.message.description',
      {
        defaultMessage: 'A generated message summarizing the status of monitors currently down',
      }
    ),
  },
  [ALERT_REASON_MSG]: {
    name: ALERT_REASON_MSG,
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.context.alertReasonMessage.description',
      {
        defaultMessage: 'A concise description of the reason for the alert',
      }
    ),
  },
  [ALERT_DETAILS_URL]: {
    name: ALERT_DETAILS_URL,
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.context.alertDetailUrl.description',
      {
        defaultMessage: 'Link to a view showing further details and context on this alert',
      }
    ),
    usesPublicBaseUrl: true,
  },
  [VIEW_IN_APP_URL]: {
    name: VIEW_IN_APP_URL,
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.context.viewInAppUrl.description',
      {
        defaultMessage: 'Open alert details and context in Synthetics app.',
      }
    ),
    usesPublicBaseUrl: true,
  },
  [RECOVERY_REASON]: {
    name: RECOVERY_REASON,
    description: i18n.translate(
      'xpack.synthetics.alertRules.monitorStatus.actionVariables.context.recoveryReason.description',
      {
        defaultMessage: 'A concise description of the reason for the recovery',
      }
    ),
  },
};
