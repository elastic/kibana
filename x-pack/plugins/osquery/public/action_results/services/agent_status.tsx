/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ActionAgentStatus } from '../types';

const visColors = euiPaletteColorBlindBehindText();
const colorToHexMap = {
  default: '#d3dae6',
  primary: visColors[1],
  success: visColors[0],
  accent: visColors[2],
  warning: visColors[5],
  danger: visColors[9],
};

export const AGENT_STATUSES: ActionAgentStatus[] = [
  ActionAgentStatus.SUCCESS,
  ActionAgentStatus.PENDING,
  ActionAgentStatus.FAILED,
];

export function getColorForAgentStatus(agentStatus: ActionAgentStatus): string {
  switch (agentStatus) {
    case ActionAgentStatus.SUCCESS:
      return colorToHexMap.success;
    case ActionAgentStatus.PENDING:
      return colorToHexMap.default;
    case ActionAgentStatus.FAILED:
      return colorToHexMap.danger;
    default:
      throw new Error(`Unsupported action agent status ${agentStatus}`);
  }
}

export function getLabelForAgentStatus(agentStatus: ActionAgentStatus, expired: boolean): string {
  switch (agentStatus) {
    case ActionAgentStatus.SUCCESS:
      return i18n.translate('xpack.osquery.liveQueryActionResults.summary.successfulLabelText', {
        defaultMessage: 'Successful',
      });
    case ActionAgentStatus.PENDING:
      return expired
        ? i18n.translate('xpack.osquery.liveQueryActionResults.summary.expiredLabelText', {
            defaultMessage: 'Expired',
          })
        : i18n.translate('xpack.osquery.liveQueryActionResults.summary.pendingLabelText', {
            defaultMessage: 'Not yet responded',
          });
    case ActionAgentStatus.FAILED:
      return i18n.translate('xpack.osquery.liveQueryActionResults.summary.failedLabelText', {
        defaultMessage: 'Failed',
      });
    default:
      throw new Error(`Unsupported action agent status ${agentStatus}`);
  }
}
