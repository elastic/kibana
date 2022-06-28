/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.noSearchResultsPromptBody',
  {
    defaultMessage: 'No search results found',
  }
);

export const EXCEPTION_EMPTY_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.addExceptionsEmptyPromptTitle',
  {
    defaultMessage: 'Add exceptions to this rule',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.emptyPromptBody',
  {
    defaultMessage:
      'There are no exceptions on your rule. Create your first rule exception.',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.emptyPromptBody',
  {
    defaultMessage:
      'Add rule exception',
  }
);

export const EXCEPTION_LOADING_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.loadingExceptionsTitle',
  {
    defaultMessage: 'Loading exceptions',
  }
);

export const CREATE_RULE_EXCEPTION_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.createRuleExceptionButtonLabel',
  {
    defaultMessage: 'Create rule exception',
  }
);

export const EXCEPTION_ITEMS_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.exceptionItemsSearchPlaceholder',
  {
    defaultMessage: 'Search on the fields below: name, description, value',
  }
);

export const exceptionItemsListFilterLabel = (numberLists: number) =>
  i18n.translate('xpack.securitySolution.exceptions.viewer.searchFilterLabel', {
    values: { numberLists },
    defaultMessage: 'Exception {numberLists, plural, =1 {list} other {lists}} [{numberLists}]',
  });

export const EXCEPTION_LISTS_FETCH_ERROR_TOASTER = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.exceptionListsFetchErrorDescription',
  {
    defaultMessage: 'Error fetching exception lists',
  }
);
