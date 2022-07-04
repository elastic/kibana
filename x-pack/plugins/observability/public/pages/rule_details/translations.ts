/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const RULE_LOAD_ERROR = (errorMessage: string) =>
  i18n.translate('xpack.observability.ruleDetails.ruleLoadError', {
    defaultMessage: 'Unable to load rule. Reason: {message}',
    values: { message: errorMessage },
  });

export const ACTIONS_LOAD_ERROR = (errorMessage: string) =>
  i18n.translate('xpack.observability.ruleDetails.connectorsLoadError', {
    defaultMessage: 'Unable to load rule actions connectors. Reason: {message}',
    values: { message: errorMessage },
  });

export const EXECUTION_LOG_ERROR = (errorMessage: string) =>
  i18n.translate('xpack.observability.ruleDetails.executionLogError', {
    defaultMessage: 'Unable to load rule execution log. Reason: {message}',
    values: { message: errorMessage },
  });

export const TAGS_TITLE = i18n.translate('xpack.observability.ruleDetails.tagsTitle', {
  defaultMessage: 'Tags',
});

export const LAST_UPDATED_MESSAGE = i18n.translate(
  'xpack.observability.ruleDetails.lastUpdatedMessage',
  {
    defaultMessage: 'Last updated',
  }
);

export const BY_WORD = i18n.translate('xpack.observability.ruleDetails.byWord', {
  defaultMessage: 'by',
});

export const ON_WORD = i18n.translate('xpack.observability.ruleDetails.onWord', {
  defaultMessage: 'on',
});

export const CREATED_WORD = i18n.translate('xpack.observability.ruleDetails.createdWord', {
  defaultMessage: 'Created',
});

export const ALERT_STATUS_LICENSE_ERROR = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusLicenseError',
  {
    defaultMessage: 'License Error',
  }
);

export const ALERT_STATUS_OK = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusOk',
  {
    defaultMessage: 'Ok',
  }
);

export const ALERT_STATUS_ACTIVE = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusActive',
  {
    defaultMessage: 'Active',
  }
);

export const ALERT_STATUS_ERROR = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusError',
  {
    defaultMessage: 'Error',
  }
);

export const ALERT_STATUS_PENDING = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusPending',
  {
    defaultMessage: 'Pending',
  }
);

export const ALERT_STATUS_UNKNOWN = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusUnknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const ALERT_STATUS_WARNING = i18n.translate(
  'xpack.observability.sections.ruleDetails.ruleStatusWarning',
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
