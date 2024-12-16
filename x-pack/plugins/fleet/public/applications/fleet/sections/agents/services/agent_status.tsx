/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { EuiThemeComputed } from '@elastic/eui-theme-common';

import type { SimplifiedAgentStatus } from '../../../types';

export const AGENT_STATUSES: SimplifiedAgentStatus[] = [
  'healthy',
  'unhealthy',
  'updating',
  'offline',
  'inactive',
  'unenrolled',
];

export function getColorForAgentStatus(
  agentStatus: SimplifiedAgentStatus,
  euiTheme: EuiThemeComputed<{}>
): string {
  switch (agentStatus) {
    case 'healthy':
      return euiTheme.colors.backgroundFilledSuccess;
    case 'offline':
      return euiTheme.colors.lightShade;
    case 'inactive':
      return euiTheme.colors.darkShade;
    case 'unhealthy':
      return euiTheme.colors.backgroundFilledWarning;
    case 'updating':
      return euiTheme.colors.backgroundFilledPrimary;
    case 'unenrolled':
      return euiTheme.colors.backgroundBaseDisabled;
    default:
      throw new Error(`Unsupported Agent status ${agentStatus}`);
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
    case 'unenrolled':
      return i18n.translate('xpack.fleet.agentStatus.unenrolledLabel', {
        defaultMessage: 'Unenrolled',
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
      throw new Error(`Unsupported Agent status ${agentStatus}`);
  }
}
