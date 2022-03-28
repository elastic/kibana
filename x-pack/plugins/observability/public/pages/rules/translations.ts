/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const RULE_STATUS_LICENSE_ERROR = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusLicenseError',
  {
    defaultMessage: 'License Error',
  }
);

export const RULE_STATUS_OK = i18n.translate('xpack.observability.rules.rulesTable.ruleStatusOk', {
  defaultMessage: 'Ok',
});

export const RULE_STATUS_ACTIVE = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusActive',
  {
    defaultMessage: 'Active',
  }
);

export const RULE_STATUS_ERROR = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusError',
  {
    defaultMessage: 'Error',
  }
);

export const RULE_STATUS_PENDING = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusPending',
  {
    defaultMessage: 'Pending',
  }
);

export const RULE_STATUS_UNKNOWN = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusUnknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const RULE_STATUS_WARNING = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusWarning',
  {
    defaultMessage: 'warning',
  }
);

export const RULE_STATUS_ENABLED = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusEnabled',
  {
    defaultMessage: 'Enabled',
  }
);

export const RULE_STATUS_DISABLED = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusDisabled',
  {
    defaultMessage: 'Disabled',
  }
);

export const RULE_STATUS_SNOOZED_INDEFINITELY = i18n.translate(
  'xpack.observability.rules.rulesTable.ruleStatusSnoozedIndefinitely',
  {
    defaultMessage: 'Snoozed indefinitely',
  }
);

export const LAST_RESPONSE_COLUMN_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.lastResponseTitle',
  {
    defaultMessage: 'Last response',
  }
);

export const LAST_RUN_COLUMN_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.lastRunTitle',
  {
    defaultMessage: 'Last run',
  }
);

export const RULE_COLUMN_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.nameTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const STATUS_COLUMN_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.statusTitle',
  {
    defaultMessage: 'Status',
  }
);

export const ACTIONS_COLUMN_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.actionsTitle',
  {
    defaultMessage: 'Actions',
  }
);

export const EDIT_ACTION_ARIA_LABEL = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.editAriaLabel',
  { defaultMessage: 'Edit' }
);

export const EDIT_ACTION_TOOLTIP = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.editButtonTooltip',
  {
    defaultMessage: 'Edit',
  }
);

export const DELETE_ACTION_TOOLTIP = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.deleteButtonTooltip',
  { defaultMessage: 'Delete' }
);

export const DELETE_ACTION_ARIA_LABEL = i18n.translate(
  'xpack.observability.rules.rulesTable.columns.deleteAriaLabel',
  { defaultMessage: 'Delete' }
);

export const RULES_PAGE_TITLE = i18n.translate('xpack.observability.rulesTitle', {
  defaultMessage: 'Rules',
});

export const RULES_BREADCRUMB_TEXT = i18n.translate(
  'xpack.observability.breadcrumbs.rulesLinkText',
  {
    defaultMessage: 'Rules',
  }
);

export const RULES_LOAD_ERROR = i18n.translate('xpack.observability.rules.loadError', {
  defaultMessage: 'Unable to load rules',
});

export const RULES_SINGLE_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.singleTitle',
  {
    defaultMessage: 'rule',
  }
);

export const RULES_PLURAL_TITLE = i18n.translate(
  'xpack.observability.rules.rulesTable.pluralTitle',
  {
    defaultMessage: 'rules',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.observability.rules.searchPlaceholderTitle',
  { defaultMessage: 'Search' }
);

export const RULES_CHANGE_STATUS = i18n.translate(
  'xpack.observability.rules.rulesTable.changeStatusAriaLabel',
  {
    defaultMessage: 'Change status',
  }
);

export const confirmModalText = (
  numIdsToDelete: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate('xpack.observability.rules.deleteSelectedIdsConfirmModal.descriptionText', {
    defaultMessage:
      "You can't recover {numIdsToDelete, plural, one {a deleted {singleTitle}} other {deleted {multipleTitle}}}.",
    values: { numIdsToDelete, singleTitle, multipleTitle },
  });

export const confirmButtonText = (
  numIdsToDelete: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate('xpack.observability.rules.deleteSelectedIdsConfirmModal.deleteButtonLabel', {
    defaultMessage:
      'Delete {numIdsToDelete, plural, one {{singleTitle}} other {# {multipleTitle}}} ',
    values: { numIdsToDelete, singleTitle, multipleTitle },
  });

export const cancelButtonText = i18n.translate(
  'xpack.observability.rules.deleteSelectedIdsConfirmModal.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const deleteSuccessText = (
  numSuccesses: number,
  singleTitle: string,
  multipleTitle: string
) =>
  i18n.translate('xpack.observability.rules.deleteSelectedIdsSuccessNotification.descriptionText', {
    defaultMessage:
      'Deleted {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multipleTitle}}}',
    values: { numSuccesses, singleTitle, multipleTitle },
  });

export const deleteErrorText = (numErrors: number, singleTitle: string, multipleTitle: string) =>
  i18n.translate('xpack.observability.rules.deleteSelectedIdsErrorNotification.descriptionText', {
    defaultMessage:
      'Failed to delete {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multipleTitle}}}',
    values: { numErrors, singleTitle, multipleTitle },
  });
