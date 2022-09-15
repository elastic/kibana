/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.noSearchResultsPromptTitle',
  {
    defaultMessage: 'No results match your search criteria',
  }
);

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.noSearchResultsPromptBody',
  {
    defaultMessage: 'Try modifying your search.',
  }
);

export const EXCEPTION_EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.addExceptionsEmptyPromptTitle',
  {
    defaultMessage: 'Add exceptions to this rule',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.emptyPromptBody',
  {
    defaultMessage: 'There are no exceptions for this rule. Create your first rule exception.',
  }
);

export const EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.endpoint.emptyPromptBody',
  {
    defaultMessage:
      'There are no endpoint exceptions. Endpoint exceptions are applied to the endpoint and the detection rule. Create your first endpoint exception.',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.emptyPromptButtonLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.endpoint.emptyPromptButtonLabel',
  {
    defaultMessage: 'Add endpoint exception',
  }
);

export const EXCEPTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.exceptionItemsFetchError',
  {
    defaultMessage: 'Unable to load exception items',
  }
);

export const EXCEPTION_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.exceptionItemsFetchErrorDescription',
  {
    defaultMessage:
      'There was an error loading the exception items. Contact your administrator for help.',
  }
);

export const EXCEPTION_SEARCH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.exceptionItemSearchErrorTitle',
  {
    defaultMessage: 'Error searching',
  }
);

export const EXCEPTION_SEARCH_ERROR_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.exceptionItemSearchErrorBody',
  {
    defaultMessage: 'An error occurred searching for exception items. Please try again.',
  }
);

export const EXCEPTION_DELETE_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.exceptionDeleteErrorTitle',
  {
    defaultMessage: 'Error deleting exception item',
  }
);

export const EXCEPTION_ITEMS_PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.paginationAriaLabel',
  {
    defaultMessage: 'Exception item table pagination',
  }
);

export const EXCEPTION_ITEM_DELETE_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.allItems.exceptionItemDeleteSuccessTitle',
  {
    defaultMessage: 'Exception deleted',
  }
);

export const EXCEPTION_ITEM_DELETE_TEXT = (itemName: string) =>
  i18n.translate('xpack.securitySolution.exceptions.allItems.exceptionItemDeleteSuccessText', {
    values: { itemName },
    defaultMessage: '"{itemName}" deleted successfully.',
  });
