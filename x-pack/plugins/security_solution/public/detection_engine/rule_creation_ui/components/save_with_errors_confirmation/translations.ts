/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SAVE_WITH_ERRORS_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.saveWithErrorsModalTitle',
  {
    defaultMessage: 'This rule has validation errors',
  }
);

export const SAVE_WITH_ERRORS_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.saveWithErrorsCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const SAVE_WITH_ERRORS_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.saveWithErrorsConfirmButton',
  {
    defaultMessage: 'Confirm',
  }
);

export const SAVE_WITH_ERRORS_MODAL_MESSAGE = (errorsCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.createRule.saveWithErrorsModalMessage', {
    defaultMessage:
      'This rule has {errorsCount} validation {errorsCount, plural, one {error} other {errors}} which can lead to failed rule executions, save anyway?',
    values: { errorsCount },
  });
