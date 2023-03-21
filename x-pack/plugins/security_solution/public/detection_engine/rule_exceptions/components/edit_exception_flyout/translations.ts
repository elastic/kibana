/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.securitySolution.ruleExceptions.editException.cancel', {
  defaultMessage: 'Cancel',
});

export const EDIT_EXCEPTION_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.editException.editExceptionTitle',
  {
    defaultMessage: 'Edit rule exception',
  }
);

export const EDIT_ENDPOINT_EXCEPTION_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.editException.editEndpointExceptionTitle',
  {
    defaultMessage: 'Edit endpoint exception',
  }
);

export const EDIT_RULE_EXCEPTION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.editException.editRuleExceptionToastSuccessTitle',
  {
    defaultMessage: 'Rule exception updated',
  }
);

export const EDIT_RULE_EXCEPTION_SUCCESS_TEXT = (exceptionItemName: string, numItems: number) =>
  i18n.translate(
    'xpack.securitySolution.ruleExceptions.editException.editRuleExceptionToastSuccessText',
    {
      values: { exceptionItemName, numItems },
      defaultMessage:
        '{numItems, plural, =1 {Exception} other {Exceptions}} - {exceptionItemName} - {numItems, plural, =1 {has} other {have}} been updated.',
    }
  );

export const EDIT_RULE_EXCEPTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.editException.editRuleExceptionToastErrorTitle',
  {
    defaultMessage: 'Error updating exception',
  }
);

export const COMMENTS_SECTION_TITLE = (comments: number) =>
  i18n.translate('xpack.securitySolution.ruleExceptions.editExceptionFlyout.commentsTitle', {
    values: { comments },
    defaultMessage: 'Add comments ({comments})',
  });
