/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const singleTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.singleTitle',
  {
    defaultMessage: 'rule',
  }
);
export const multipleTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.multipleTitle',
  {
    defaultMessage: 'rules',
  }
);
export const cancelButtonText = i18n.translate(
  'xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const getConfirmModalText = (numberIdsToDelete: number) =>
  i18n.translate('xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.descriptionText', {
    defaultMessage:
      "You won't be able to recover {numberIdsToDelete, plural, one {a deleted {singleTitle}} other {deleted {multipleTitle}}}.",
    values: { numberIdsToDelete, singleTitle, multipleTitle },
  });
export const getConfirmButtonText = (numberIdsToDelete: number) =>
  i18n.translate('xpack.triggersActionsUI.deleteSelectedIdsConfirmModal.deleteButtonLabel', {
    defaultMessage:
      'Delete {numberIdsToDelete, plural, one {{singleTitle}} other {# {multipleTitle}}} ',
    values: { numberIdsToDelete, singleTitle, multipleTitle },
  });
export const getSuccessfulNotificationText = (numSuccesses: number) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.deleteSelectedIdsSuccessNotification.descriptionText',
    {
      defaultMessage:
        'Deleted {numSuccesses, number} {numSuccesses, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: { numSuccesses, singleTitle, multipleTitle },
    }
  );
export const getFailedNotificationText = (numErrors: number) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.deleteSelectedIdsErrorNotification.descriptionText',
    {
      defaultMessage:
        'Failed to delete {numErrors, number} {numErrors, plural, one {{singleTitle}} other {{multipleTitle}}}',
      values: { numErrors, singleTitle, multipleTitle },
    }
  );
