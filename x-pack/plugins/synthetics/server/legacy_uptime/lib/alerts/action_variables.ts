/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MESSAGE = 'message';
export const ALERT_REASON_MSG = 'reason';
export const ALERT_DETAILS_URL = 'alertDetailsUrl';
export const VIEW_IN_APP_URL = 'viewInAppUrl';

export const ACTION_VARIABLES = {
  [MESSAGE]: {
    name: MESSAGE,
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.context.message.description',
      {
        defaultMessage: 'A generated message summarizing the currently down monitors',
      }
    ),
  },
  [ALERT_REASON_MSG]: {
    name: ALERT_REASON_MSG,
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.context.alertReasonMessage.description',
      {
        defaultMessage: 'A concise description of the reason for the alert',
      }
    ),
  },
  [ALERT_DETAILS_URL]: {
    name: ALERT_DETAILS_URL,
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.context.alertDetailUrl.description',
      {
        defaultMessage:
          'Link to the view within Elastic that shows further details and context surrounding this alert',
      }
    ),
  },
  [VIEW_IN_APP_URL]: {
    name: VIEW_IN_APP_URL,
    description: i18n.translate(
      'xpack.synthetics.alerts.monitorStatus.actionVariables.context.viewInAppUrl.description',
      {
        defaultMessage:
          'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
      }
    ),
  },
};
