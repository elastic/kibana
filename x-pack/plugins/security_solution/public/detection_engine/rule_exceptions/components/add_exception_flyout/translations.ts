/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate('xpack.securitySolution.ruleExceptions.addException.cancel', {
  defaultMessage: 'Cancel',
});

export const CREATE_RULE_EXCEPTION = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addException.createRuleExceptionLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const ADD_ENDPOINT_EXCEPTION = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addException.addEndpointException',
  {
    defaultMessage: 'Add Endpoint Exception',
  }
);

export const SUBMIT_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addException.submitError.title',
  {
    defaultMessage: 'An error occured submitting exception',
  }
);

export const SUBMIT_ERROR_DISMISS_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addException.submitError.dismissButton',
  {
    defaultMessage: 'Dismiss',
  }
);

export const SUBMIT_ERROR_DISMISS_MESSAGE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addException.submitError.message',
  {
    defaultMessage: 'View toast for error details.',
  }
);

export const ADD_EXCEPTION_SUCCESS = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addException.success',
  {
    defaultMessage: 'Rule exception added to shared exception list',
  }
);

export const ADD_EXCEPTION_SUCCESS_DETAILS = (listNames: string) =>
  i18n.translate(
    'xpack.securitySolution.ruleExceptions.addExceptionFlyout.closeAlerts.successDetails',
    {
      values: { listNames },
      defaultMessage: 'Rule exception has been added to shared lists: {listNames}.',
    }
  );

export const ADD_RULE_EXCEPTION_SUCCESS_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.addExceptionFlyout.addRuleExceptionToastSuccessTitle',
  {
    defaultMessage: 'Rule exception added',
  }
);

export const ADD_RULE_EXCEPTION_SUCCESS_TEXT = (ruleName: string) =>
  i18n.translate(
    'xpack.securitySolution.ruleExceptions.addExceptionFlyout.addRuleExceptionToastSuccessText',
    {
      values: { ruleName },
      defaultMessage: 'Exception has been added to rules - {ruleName}.',
    }
  );

export const COMMENTS_SECTION_TITLE = (comments: number) =>
  i18n.translate('xpack.securitySolution.ruleExceptions.addExceptionFlyout.commentsTitle', {
    values: { comments },
    defaultMessage: 'Add comments ({comments})',
  });
