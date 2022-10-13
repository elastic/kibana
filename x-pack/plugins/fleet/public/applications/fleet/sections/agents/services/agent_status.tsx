/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlindBehindText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';

import type { SimplifiedAgentStatus } from '../../../types';

const visColors = euiPaletteColorBlindBehindText();
const colorToHexMap = {
  // using variables as mentioned here https://elastic.github.io/eui/#/guidelines/getting-started
  default: euiLightVars.euiColorLightShade,
  primary: visColors[1],
  success: visColors[0],
  accent: visColors[2],
  warning: visColors[5],
  danger: visColors[9],
  inactive: euiLightVars.euiColorDarkShade,
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
      return colorToHexMap.success;
    case 'offline':
      return colorToHexMap.default;
    case 'inactive':
      return colorToHexMap.inactive;
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
