/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MESSAGE = 'message';
export const MONITOR_WITH_GEO = 'downMonitorsWithGeo';
export const ALERT_REASON_MSG = 'reason';
export const VIEW_IN_APP_URL = 'viewInAppUrl';

export const ACTION_VARIABLES = {
  [MESSAGE]: {
    name: MESSAGE,
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.context.message.description',
      {
        defaultMessage: 'A generated message summarizing the currently down monitors',
      }
    ),
  },
  [MONITOR_WITH_GEO]: {
    name: MONITOR_WITH_GEO,
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.context.downMonitorsWithGeo.description',
      {
        defaultMessage:
          'A generated summary that shows some or all of the monitors detected as "down" by the alert',
      }
    ),
  },
  [ALERT_REASON_MSG]: {
    name: ALERT_REASON_MSG,
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.context.alertReasonMessage.description',
      {
        defaultMessage: 'A concise description of the reason for the alert',
      }
    ),
  },
  [VIEW_IN_APP_URL]: {
    name: VIEW_IN_APP_URL,
    description: i18n.translate(
      'xpack.uptime.alerts.monitorStatus.actionVariables.context.viewInAppUrl.description',
      {
        defaultMessage:
          'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
      }
    ),
  },
};
