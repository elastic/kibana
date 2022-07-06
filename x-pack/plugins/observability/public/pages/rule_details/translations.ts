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
