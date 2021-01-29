/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_STATUS_OK = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertStatusOk',
  {
    defaultMessage: 'Ok',
  }
);

export const ALERT_STATUS_ACTIVE = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertStatusActive',
  {
    defaultMessage: 'Active',
  }
);

export const ALERT_STATUS_ERROR = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertStatusError',
  {
    defaultMessage: 'Error',
  }
);

export const ALERT_STATUS_PENDING = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertStatusPending',
  {
    defaultMessage: 'Pending',
  }
);

export const ALERT_STATUS_UNKNOWN = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertStatusUnknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const alertsStatusesTranslationsMapping = {
  ok: ALERT_STATUS_OK,
  active: ALERT_STATUS_ACTIVE,
  error: ALERT_STATUS_ERROR,
  pending: ALERT_STATUS_PENDING,
  unknown: ALERT_STATUS_UNKNOWN,
};

export const ALERT_ERROR_UNKNOWN_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertErrorReasonUnknown',
  {
    defaultMessage: 'An error occurred for unknown reasons.',
  }
);

export const ALERT_ERROR_READING_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertErrorReasonReading',
  {
    defaultMessage: 'An error occurred when reading the alert.',
  }
);

export const ALERT_ERROR_DECRYPTING_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertErrorReasonDecrypting',
  {
    defaultMessage: 'An error occurred when decrypting the alert.',
  }
);

export const ALERT_ERROR_EXECUTION_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertErrorReasonRunning',
  {
    defaultMessage: 'An error occurred when running the alert.',
  }
);

export const ALERT_ERROR_LICENSE_REASON = i18n.translate(
  'xpack.triggersActionsUI.sections.alertsList.alertErrorReasonLicense',
  {
    defaultMessage: 'Cannot run alert',
  }
);

export enum AlertErrorReasons {
  READ = 'read',
  DECRYPT = 'decrypt',
  EXECUTE = 'execute',
  UNKNOWN = 'unknown',
  LICENSE = 'license',
}

export const alertsErrorReasonTranslationsMapping = {
  [AlertErrorReasons.READ]: ALERT_ERROR_READING_REASON,
  [AlertErrorReasons.DECRYPT]: ALERT_ERROR_DECRYPTING_REASON,
  [AlertErrorReasons.EXECUTE]: ALERT_ERROR_EXECUTION_REASON,
  [AlertErrorReasons.UNKNOWN]: ALERT_ERROR_UNKNOWN_REASON,
  [AlertErrorReasons.LICENSE]: ALERT_ERROR_LICENSE_REASON,
};
