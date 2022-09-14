/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BulkEditResponse } from '../../../types';

const allSuccessSnoozeMessage = (total: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.snooze.allSuccess', {
    defaultMessage:
      'Successfully updated snooze for {total, plural, one {# rule} other {# rules}}.',
    values: { total },
  });

const someSuccessSnoozeMessage = (success: number, failure: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.snooze.someSuccess', {
    defaultMessage:
      'Successfully updated snooze for some rules, failed for {failure, plural, one {# rule} other {# rules}}.',
    values: { success, failure },
  });

const allFailureSnoozeMessage = (total: number) =>
  i18n.translate('xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.snooze.allFailure', {
    defaultMessage: 'Failed to update snooze for {total, plural, one {# rule} other {# rules}}.',
    values: { total },
  });

const allSuccessUpdateApiKeyMessage = (total: number) =>
  i18n.translate(
    'xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.updateApiKey.allSuccess',
    {
      defaultMessage:
        'Successfully updated API key for {total, plural, one {# rule} other {# rules}}.',
      values: { total },
    }
  );

const someSuccessUpdateApiKeyMessage = (success: number, failure: number) =>
  i18n.translate(
    'xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.updateApiKey.someSuccess',
    {
      defaultMessage:
        'Successfully updated API key for some rules, failed for {failure, plural, one {# rule} other {# rules}}.',
      values: { success, failure },
    }
  );

const allFailureUpdateApiKeyMessage = (total: number) =>
  i18n.translate(
    'xpack.triggersActionsUI.sections.ruleApi.bulkEditResponse.updateApiKey.allFailure',
    {
      defaultMessage:
        'Failed to updated API key for {total, plural, one {# rule} other {# rules}}.',
      values: { total },
    }
  );

export const getFormattedBulkSnoozeResponseMessage = (response: BulkEditResponse) => {
  const { errors, total } = response;
  if (!errors.length) {
    return allSuccessSnoozeMessage(total);
  }
  if (errors.length === total) {
    return allFailureSnoozeMessage(total);
  }
  return someSuccessSnoozeMessage(total - errors.length, errors.length);
};

export const getFormattedBulkUpdateApiKeyResponseMessage = (response: BulkEditResponse) => {
  const { errors, total } = response;
  if (!errors.length) {
    return allSuccessUpdateApiKeyMessage(total);
  }
  if (errors.length === total) {
    return allFailureUpdateApiKeyMessage(total);
  }
  return someSuccessUpdateApiKeyMessage(total - errors.length, errors.length);
};
