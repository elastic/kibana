/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SimplifiedAgentStatus } from '../../../types';

const visColors = euiPaletteColorBlindBehindText();
const colorToHexMap = {
  // TODO - replace with variable once https://github.com/elastic/eui/issues/2731 is closed
  default: '#d3dae6',
  primary: visColors[1],
  secondary: visColors[0],
  accent: visColors[2],
  warning: visColors[5],
  danger: visColors[9],
};

export const AGENT_STATUSES: SimplifiedAgentStatus[] = [
  'healthy',
  'unhealthy',
  'updating',
  'offline',
  'inactive',
];

export function getColorForAgentStatus(agentStatus: SimplifiedAgentStatus): string {
  switch (agentStatus) {
    case 'healthy':
      return colorToHexMap.secondary;
    case 'offline':
    case 'inactive':
      return colorToHexMap.default;
    case 'unhealthy':
      return colorToHexMap.warning;
    case 'updating':
      return colorToHexMap.primary;
    default:
      throw new Error(`Insuported Agent status ${agentStatus}`);
  }
}

export function getLabelForAgentStatus(agentStatus: SimplifiedAgentStatus): string {
  switch (agentStatus) {
    case 'healthy':
      return i18n.translate('xpack.fleet.agentStatus.healthyLabel', {
        defaultMessage: 'Healthy',
      });
    case 'offline':
      return i18n.translate('xpack.fleet.agentStatus.offlineLabel', {
        defaultMessage: 'Offline',
      });
    case 'inactive':
      return i18n.translate('xpack.fleet.agentStatus.inactiveLabel', {
        defaultMessage: 'Inactive',
      });
    case 'unhealthy':
      return i18n.translate('xpack.fleet.agentStatus.unhealthyLabel', {
        defaultMessage: 'Unhealthy',
      });
    case 'updating':
      return i18n.translate('xpack.fleet.agentStatus.updatingLabel', {
        defaultMessage: 'Updating',
      });
    default:
      throw new Error(`Insuported Agent status ${agentStatus}`);
  }
}
