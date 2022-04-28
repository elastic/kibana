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

export const rulesStatusesTranslationsMapping = {
  ok: ALERT_STATUS_OK,
  active: ALERT_STATUS_ACTIVE,
  error: ALERT_STATUS_ERROR,
  pending: ALERT_STATUS_PENDING,
  unknown: ALERT_STATUS_UNKNOWN,
  warning: ALERT_STATUS_WARNING,
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

export const ALERT_WARNING_MAX_EXECUTABLE_ACTIONS_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.ruleWarningReasonMaxExecutableActions',
  {
    defaultMessage: 'Action limit exceeded',
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
};

export const rulesWarningReasonTranslationsMapping = {
  maxExecutableActions: ALERT_WARNING_MAX_EXECUTABLE_ACTIONS_REASON,
  unknown: ALERT_WARNING_UNKNOWN_REASON,
};
