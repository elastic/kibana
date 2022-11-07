/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const singleRuleTitle = i18n.translate(
  'xpack.triggersActionsUI.sections.rulesList.singleTitle',
  {
    defaultMessage: 'rule',
  }
);
export const multipleRuleTitle = i18n.translate(
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

export const getConfirmModalText = (
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

export const getConfirmButtonText = (
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
export const getSuccessfulNotificationText = (
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
export const getFailedNotificationText = (
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

export const getPartialSuccessNotificationText = (
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
