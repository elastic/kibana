/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_STATUS_OK = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusOk',
  {
    defaultMessage: 'Ok',
  }
);

export const ALERT_STATUS_ACTIVE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusActive',
  {
    defaultMessage: 'Active',
  }
);

export const ALERT_STATUS_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusError',
  {
    defaultMessage: 'Error',
  }
);

export const ALERT_STATUS_LICENSE_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusLicenseError',
  {
    defaultMessage: 'License Error',
  }
);

export const ALERT_STATUS_PENDING = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusPending',
  {
    defaultMessage: 'Pending',
  }
);

export const ALERT_STATUS_UNKNOWN = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusUnknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const ALERT_STATUS_WARNING = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleStatusWarning',
  {
    defaultMessage: 'Warning',
  }
);
export const RULE_LAST_RUN_OUTCOME_SUCCEEDED = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleLastRunOutcomeSucceeded',
  {
    defaultMessage: 'Succeeded',
  }
);

export const RULE_LAST_RUN_OUTCOME_WARNING = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleLastRunOutcomeWarning',
  {
    defaultMessage: 'Warning',
  }
);

export const RULE_LAST_RUN_OUTCOME_FAILED = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleLastRunOutcomeFailed',
  {
    defaultMessage: 'Failed',
  }
);

export const rulesStatusesTranslationsMapping = {
  ok: ALERT_STATUS_OK,
  active: ALERT_STATUS_ACTIVE,
  error: ALERT_STATUS_ERROR,
  pending: ALERT_STATUS_PENDING,
  unknown: ALERT_STATUS_UNKNOWN,
  warning: ALERT_STATUS_WARNING,
};

export const rulesLastRunOutcomeTranslationMapping = {
  succeeded: RULE_LAST_RUN_OUTCOME_SUCCEEDED,
  warning: RULE_LAST_RUN_OUTCOME_WARNING,
  failed: RULE_LAST_RUN_OUTCOME_FAILED,
};

export const ALERT_ERROR_UNKNOWN_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonUnknown',
  {
    defaultMessage: 'An error occurred for unknown reasons.',
  }
);

export const ALERT_ERROR_READING_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonReading',
  {
    defaultMessage: 'An error occurred when reading the rule.',
  }
);

export const ALERT_ERROR_DECRYPTING_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonDecrypting',
  {
    defaultMessage: 'An error occurred when decrypting the rule.',
  }
);

export const ALERT_ERROR_EXECUTION_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonRunning',
  {
    defaultMessage: 'An error occurred when running the rule.',
  }
);

export const ALERT_ERROR_LICENSE_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonLicense',
  {
    defaultMessage: 'Cannot run rule',
  }
);

export const ALERT_ERROR_TIMEOUT_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonTimeout',
  {
    defaultMessage: 'Rule execution cancelled due to timeout.',
  }
);

export const ALERT_ERROR_DISABLED_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonDisabled',
  {
    defaultMessage: 'Rule failed to execute because rule ran after it was disabled.',
  }
);

export const ALERT_ERROR_VALIDATE_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleErrorReasonValidate',
  {
    defaultMessage: 'An error occurred when validating the rule parameters.',
  }
);

export const ALERT_WARNING_MAX_EXECUTABLE_ACTIONS_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleWarningReasonMaxExecutableActions',
  {
    defaultMessage: 'Action limit exceeded',
  }
);

export const ALERT_WARNING_MAX_QUEUED_ACTIONS_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleWarningReasonMaxQueuedActions',
  {
    defaultMessage: 'Queued action limit exceeded.',
  }
);

export const ALERT_WARNING_MAX_ALERTS_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleWarningReasonMaxAlerts',
  {
    defaultMessage: 'Alert limit exceeded',
  }
);

export const ALERT_WARNING_UNKNOWN_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleWarningReasonUnknown',
  {
    defaultMessage: 'Unknown reason',
  }
);

export const rulesErrorReasonTranslationsMapping = {
  read: ALERT_ERROR_READING_REASON,
  decrypt: ALERT_ERROR_DECRYPTING_REASON,
  execute: ALERT_ERROR_EXECUTION_REASON,
  unknown: ALERT_ERROR_UNKNOWN_REASON,
  license: ALERT_ERROR_LICENSE_REASON,
  timeout: ALERT_ERROR_TIMEOUT_REASON,
  disabled: ALERT_ERROR_DISABLED_REASON,
  validate: ALERT_ERROR_VALIDATE_REASON,
};

export const rulesWarningReasonTranslationsMapping = {
  maxExecutableActions: ALERT_WARNING_MAX_EXECUTABLE_ACTIONS_REASON,
  maxAlerts: ALERT_WARNING_MAX_ALERTS_REASON,
  maxQueuedActions: ALERT_WARNING_MAX_QUEUED_ACTIONS_REASON,
  unknown: ALERT_WARNING_UNKNOWN_REASON,
};

export const SELECT_ALL_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selectAllAriaLabel',
  { defaultMessage: 'Toggle select all rules' }
);

export const SELECT_SHOW_BULK_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.rulesListTable.columns.selectShowBulkActionsAriaLabel',
  { defaultMessage: 'Show bulk actions' }
);

export const TOTAL_RULES = (formattedTotalRules: string, totalRules: number) => {
  return i18n.translate('xpack.triggersActionsUI.sections.rulesList.totalRulesLabel', {
    values: { formattedTotalRules, totalRules },
    defaultMessage: '{formattedTotalRules} {totalRules, plural, =1 {rule} other {rules}}',
  });
};

export const SELECTED_RULES = (formattedSelectedRules: string, selectedRules: number) => {
  return i18n.translate('xpack.triggersActionsUI.sections.rulesList.selectedRulesButton', {
    values: { formattedSelectedRules, selectedRules },
    defaultMessage:
      'Selected {formattedSelectedRules} {selectedRules, plural, =1 {rule} other {rules}}',
  });
};

export const SELECT_ALL_RULES = (formattedTotalRules: string, totalRules: number) => {
  return i18n.translate('xpack.triggersActionsUI.sections.rulesList.selectAllRulesButton', {
    values: { formattedTotalRules, totalRules },
    defaultMessage:
      'Select all {formattedTotalRules} {totalRules, plural, =1 {rule} other {rules}}',
  });
};

export const CLEAR_SELECTION = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.clearAllSelectionButton',
  {
    defaultMessage: 'Clear selection',
  }
);

export const RULE_STATUS_ACTIVE = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.totalStatusesActiveDescription',
    {
      defaultMessage: 'Active: {totalStatusesActive}',
      values: { totalStatusesActive: total },
    }
  );
};

export const RULE_STATUS_ERROR = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.totalStatusesErrorDescription',
    {
      defaultMessage: 'Error: {totalStatusesError}',
      values: { totalStatusesError: total },
    }
  );
};

export const RULE_STATUS_WARNING = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.totalStatusesWarningDescription',
    {
      defaultMessage: 'Warning: {totalStatusesWarning}',
      values: { totalStatusesWarning: total },
    }
  );
};

export const RULE_STATUS_OK = (total: number) => {
  return i18n.translate('xpack.triggersActionsUI.sections.rulesList.totalStatusesOkDescription', {
    defaultMessage: 'Ok: {totalStatusesOk}',
    values: { totalStatusesOk: total },
  });
};

export const RULE_STATUS_PENDING = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.totalStatusesPendingDescription',
    {
      defaultMessage: 'Pending: {totalStatusesPending}',
      values: { totalStatusesPending: total },
    }
  );
};

export const RULE_STATUS_UNKNOWN = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.totalStatusesUnknownDescription',
    {
      defaultMessage: 'Unknown: {totalStatusesUnknown}',
      values: { totalStatusesUnknown: total },
    }
  );
};

export const RULE_LAST_RUN_OUTCOME_SUCCEEDED_DESCRIPTION = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.lastRunOutcomeSucceededDescription',
    {
      defaultMessage: 'Succeeded: {total}',
      values: { total },
    }
  );
};

export const RULE_LAST_RUN_OUTCOME_WARNING_DESCRIPTION = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.lastRunOutcomeWarningDescription',
    {
      defaultMessage: 'Warning: {total}',
      values: { total },
    }
  );
};

export const RULE_LAST_RUN_OUTCOME_FAILED_DESCRIPTION = (total: number) => {
  return i18n.translate(
    'xpack.triggersActionsUI.sections.rulesList.lastRunOutcomeFailedDescription',
    {
      defaultMessage: 'Failed: {total}',
      values: { total },
    }
  );
};

export const SINGLE_RULE_TITLE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.singleTitle',
  {
    defaultMessage: 'rule',
  }
);
export const MULTIPLE_RULE_TITLE = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.multipleTitle',
  {
    defaultMessage: 'rules',
  }
);

export const CANCEL_BUTTON_TEXT = i18n.translate(
  'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const CLEAR_FILTERS = (numberOfFilters: number) => {
  return i18n.translate('xpack.triggersActionsUI.sections.rulesList.clearFilterLink', {
    values: { numberOfFilters },
    defaultMessage: 'Clear {numberOfFilters, plural, =1 {filter} other {filters}}',
  });
};

export const getConfirmDeletionModalText = (
  numIdsToDelete: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate('xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.descriptionText', {
    defaultMessage:
      "You won't be able to recover {numIdsToDelete, plural, one {a deleted {singleTitle}} other {deleted {multipleTitle}}}.",
    values: {
      numIdsToDelete,
      singleTitle,
      multipleTitle,
    },
  });

export const getConfirmDeletionButtonText = (
  numIdsToDelete: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate('xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.deleteButtonLabel', {
    defaultMessage:
      'Delete {numIdsToDelete, plural, one {{singleTitle}} other {# {multipleTitle}}} ',
    values: {
      numIdsToDelete,
      singleTitle,
      multipleTitle,
    },
  });

export const getSuccessfulDeletionNotificationText = (
  numSuccesses: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.deleteSelectedIdsSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Deleted {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: {
        numSuccesses,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getSuccessfulEnablingNotificationText = (
  numSuccesses: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.enableSelectedIdsSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Enabled {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: {
        numSuccesses,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getSuccessfulDisablingNotificationText = (
  numSuccesses: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.disableSelectedIdsSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Disabled {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: {
        numSuccesses,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getFailedDeletionNotificationText = (
  numErrors: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.deleteSelectedIdsErrorNotification.descriptionText',
    {
      defaultMessage:
        'Failed to delete {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: {
        numErrors,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getFailedEnablingNotificationText = (
  numErrors: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.enableSelectedIdsErrorNotification.descriptionText',
    {
      defaultMessage:
        'Failed to enable {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: {
        numErrors,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getFailedDisablingNotificationText = (
  numErrors: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.disableSelectedIdsErrorNotification.descriptionText',
    {
      defaultMessage:
        'Failed to disable {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: {
        numErrors,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getPartialSuccessDeletionNotificationText = (
  numberOfSuccess: number,
  numberOfErrors: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.deleteSelectedIdsPartialSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Deleted {numberOfSuccess, number} {numberOfSuccess, plural, one {{singleTitle}} other {{multipleTitle}}}, {numberOfErrors, number} {numberOfErrors, plural, one {{singleTitle}} other {{multipleTitle}}} encountered errors',
      values: {
        numberOfSuccess,
        numberOfErrors,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getPartialSuccessEnablingNotificationText = (
  numberOfSuccess: number,
  numberOfErrors: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.enableSelectedIdsPartialSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Enabled {numberOfSuccess, number} {numberOfSuccess, plural, one {{singleTitle}} other {{multipleTitle}}}, {numberOfErrors, number} {numberOfErrors, plural, one {{singleTitle}} other {{multipleTitle}}} encountered errors',
      values: {
        numberOfSuccess,
        numberOfErrors,
        singleTitle,
        multipleTitle,
      },
    }
  );

export const getPartialSuccessDisablingNotificationText = (
  numberOfSuccess: number,
  numberOfErrors: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.disableSelectedIdsPartialSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Disabled {numberOfSuccess, number} {numberOfSuccess, plural, one {{singleTitle}} other {{multipleTitle}}}, {numberOfErrors, number} {numberOfErrors, plural, one {{singleTitle}} other {{multipleTitle}}} encountered errors',
      values: {
        numberOfSuccess,
        numberOfErrors,
        singleTitle,
        multipleTitle,
      },
    }
  );
