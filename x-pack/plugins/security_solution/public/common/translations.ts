/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ConsoleResponseActionCommands,
  ResponseActionAgentType,
} from '../../common/endpoint/service/response_actions/constants';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolution.pages.common.solutionName', {
  defaultMessage: 'Security',
});

export const ASSISTANT_MANAGEMENT_TITLE = i18n.translate(
  'xpack.securitySolution.securityAiAssistantManagement.app.title',
  {
    defaultMessage: 'AI Assistant for Security',
  }
);

export const BETA = i18n.translate('xpack.securitySolution.pages.common.beta', {
  defaultMessage: 'Beta',
});

export const BETA_TOOLTIP = i18n.translate('xpack.securitySolution.pages.common.beta.tooltip', {
  defaultMessage:
    'This functionality is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
});

export const TECHNICAL_PREVIEW = i18n.translate(
  'xpack.securitySolution.pages.common.technicalPreviewLabel',
  {
    defaultMessage: 'Technical Preview',
  }
);

export const TECHNICAL_PREVIEW_TOOLTIP = i18n.translate(
  'xpack.securitySolution.pages.common.technicalPreviewTooltip',
  {
    defaultMessage:
      'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
  }
);

export const UPDATE_ALERT_STATUS_FAILED = (conflicts: number) =>
  i18n.translate('xpack.securitySolution.pages.common.updateAlertStatusFailed', {
    values: { conflicts },
    defaultMessage:
      'Failed to update { conflicts } {conflicts, plural, =1 {alert} other {alerts}}.',
  });

export const UPDATE_ALERT_STATUS_FAILED_DETAILED = (updated: number, conflicts: number) =>
  i18n.translate('xpack.securitySolution.pages.common.updateAlertStatusFailedDetailed', {
    values: { updated, conflicts },
    defaultMessage: `{ updated } {updated, plural, =1 {alert was} other {alerts were}} updated successfully, but { conflicts } failed to update
         because { conflicts, plural, =1 {it was} other {they were}} already being modified.`,
  });

export const UPGRADE_AGENT_FOR_RESPONDER = (
  _agentType: ResponseActionAgentType,
  command: ConsoleResponseActionCommands
) => {
  const agentType = getAgentTypeName(_agentType);

  if (_agentType === 'endpoint') {
    return i18n.translate('xpack.securitySolution.endpoint.actions.unsupported.message', {
      defaultMessage: `The current version of the {agentType} Agent does not support {command}. Upgrade your Elastic Agent through Fleet to the latest version to enable this response action.`,
      values: { agentType, command },
    });
  }

  return i18n.translate('xpack.securitySolution.agent.actions.unsupported.message', {
    defaultMessage: `Support for {command} is not currently available for {agentType}.`,
    values: { agentType, command },
  });
};

export const INSUFFICIENT_PRIVILEGES_FOR_COMMAND = i18n.translate(
  'xpack.securitySolution.endpoint.actions.insufficientPrivileges.error',
  {
    defaultMessage:
      'You do not have sufficient privileges to use this command. Please contact your administrator for access.',
  }
);

export const UNSAVED_TIMELINE_SAVE_PROMPT = i18n.translate(
  'xpack.securitySolution.timeline.unsavedWorkMessage',
  {
    defaultMessage: 'Leave Timeline with unsaved work?',
  }
);

export const UNSAVED_TIMELINE_SAVE_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.timeline.unsavedWorkTitle',
  {
    defaultMessage: 'Unsaved changes',
  }
);

export const getAgentTypeName = (agentType: ResponseActionAgentType) => {
  switch (agentType) {
    case 'endpoint':
      return 'Elastic Defend';
    case 'sentinel_one':
      return 'SentinelOne';
    case 'crowdstrike':
      return 'Crowdstrike';
    default:
      return agentType;
  }
};

export const RULE_EXECUTION_TYPE_BACKFILL = i18n.translate(
  'xpack.securitySolution.detectionEngine.executionRunType.backfill',
  {
    defaultMessage: 'Manual',
  }
);

export const RULE_EXECUTION_TYPE_STANDARD = i18n.translate(
  'xpack.securitySolution.detectionEngine.executionRunType.standard',
  {
    defaultMessage: 'Scheduled',
  }
);
