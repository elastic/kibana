/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.noSearchResultsPromptTitle',
  {
    defaultMessage: 'No results match your search criteria',
  }
);

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.noSearchResultsPromptBody',
  {
    defaultMessage: 'Try modifying your search.',
  }
);

export const EXCEPTION_EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.addExceptionsEmptyPromptTitle',
  {
    defaultMessage: 'Add exceptions to this rule',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.emptyPromptBody',
  {
    defaultMessage: 'There are no exceptions for this rule. Create your first rule exception.',
  }
);

export const EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.endpoint.emptyPromptBody',
  {
    defaultMessage: 'There are no endpoint exceptions. Create your first endpoint exception.',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.emptyPromptButtonLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.endpoint.emptyPromptButtonLabel',
  {
    defaultMessage: 'Add endpoint exception',
  }
);

export const EXCEPTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionItemsFetchError',
  {
    defaultMessage: 'Unable to load exception items',
  }
);

export const EXCEPTION_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionItemsFetchErrorDescription',
  {
    defaultMessage:
      'There was an error loading the exception items. Contact your administrator for help.',
  }
);

export const EXCEPTION_SEARCH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionItemSearchErrorTitle',
  {
    defaultMessage: 'Error searching',
  }
);

export const EXCEPTION_SEARCH_ERROR_BODY = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionItemSearchErrorBody',
  {
    defaultMessage: 'An error occurred searching for exception items. Please try again.',
  }
);

export const EXCEPTION_DELETE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionDeleteErrorTitle',
  {
    defaultMessage: 'Error deleting exception item',
  }
);

export const EXCEPTION_ITEMS_PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.paginationAriaLabel',
  {
    defaultMessage: 'Exception item table pagination',
  }
);

export const EXCEPTION_ITEM_DELETE_TITLE = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionItemDeleteSuccessTitle',
  {
    defaultMessage: 'Exception deleted',
  }
);

export const EXCEPTION_ITEM_DELETE_TEXT = (itemName: string) =>
  i18n.translate(
    'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionItemDeleteSuccessText',
    {
      values: { itemName },
      defaultMessage: '"{itemName}" deleted successfully.',
    }
  );

export const ENDPOINT_EXCEPTIONS_TAB_ABOUT = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionEndpointDetailsDescription',
  {
    defaultMessage:
      'Endpoint exceptions are added to both the detection rule and the Elastic Endpoint agent on your hosts.',
  }
);

export const EXCEPTIONS_TAB_ABOUT = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.exceptionDetectionDetailsDescription',
  {
    defaultMessage: 'Rule exceptions are added to the detection rule.',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.searchPlaceholder',
  {
    defaultMessage: 'Filter exceptions using simple query syntax, for example, name:"my list"',
  }
);

export const ADD_TO_ENDPOINT_LIST = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.addToEndpointListLabel',
  {
    defaultMessage: 'Add endpoint exception',
  }
);

export const ADD_TO_DETECTIONS_LIST = i18n.translate(
  'xpack.securitySolution.ruleExceptions.allExceptionItems.addToDetectionsListLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);
