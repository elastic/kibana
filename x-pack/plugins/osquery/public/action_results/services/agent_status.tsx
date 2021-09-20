/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { ActionAgentStatus } from '../types';

const visColors = euiPaletteColorBlindBehindText();
const colorToHexMap = {
  default: '#d3dae6',
  primary: visColors[1],
  secondary: visColors[0],
  accent: visColors[2],
  warning: visColors[5],
  danger: visColors[9],
};

export const AGENT_STATUSES: ActionAgentStatus[] = ['success', 'pending', 'failed'];

export function getColorForAgentStatus(agentStatus: ActionAgentStatus): string {
  switch (agentStatus) {
    case 'success':
      return colorToHexMap.secondary;
    case 'pending':
      return colorToHexMap.default;
    case 'failed':
      return colorToHexMap.danger;
    default:
      throw new Error(`Unsupported action agent status ${agentStatus}`);
  }
}

export function getLabelForAgentStatus(agentStatus: ActionAgentStatus, expired: boolean): string {
  switch (agentStatus) {
    case 'success':
      return i18n.translate('xpack.osquery.liveQueryActionResults.summary.successfulLabelText', {
        defaultMessage: 'Successful',
      });
    case 'pending':
      return expired
        ? i18n.translate('xpack.osquery.liveQueryActionResults.summary.expiredLabelText', {
            defaultMessage: 'Expired',
          })
        : i18n.translate('xpack.osquery.liveQueryActionResults.summary.pendingLabelText', {
            defaultMessage: 'Not yet responded',
          });
    case 'failed':
      return i18n.translate('xpack.osquery.liveQueryActionResults.summary.failedLabelText', {
        defaultMessage: 'Failed',
      });
    default:
      throw new Error(`Unsupported action agent status ${agentStatus}`);
  }
}
