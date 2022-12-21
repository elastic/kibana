/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SOLUTION_NAME = i18n.translate('xpack.securitySolution.pages.common.solutionName', {
  defaultMessage: 'Security',
});

export const BETA = i18n.translate('xpack.securitySolution.pages.common.beta', {
  defaultMessage: 'Beta',
});

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

export const UPGRADE_ENDPOINT_FOR_RESPONDER = i18n.translate(
  'xpack.securitySolution.endpoint.actions.disabledResponder.tooltip',
  {
    defaultMessage:
      'The current version of the Agent does not support this feature. Upgrade your Agent through Fleet to use this feature and new response actions such as killing and suspending processes.',
  }
);

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
