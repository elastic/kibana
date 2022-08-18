/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.noSearchResultsPromptTitle',
  {
    defaultMessage: 'No results',
  }
);

export const EXCEPTION_NO_SEARCH_RESULTS_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.noSearchResultsPromptBody',
  {
    defaultMessage: 'No matching exception items were found in your search.',
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
    defaultMessage: 'There are no exceptions on your rule. Create your first rule exception.',
  }
);

export const EXCEPTION_EMPTY_ENDPOINT_PROMPT_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.endpoint.emptyPromptBody',
  {
    defaultMessage:
      'There are no endpoint exceptions. Endpoint exceptions are applied to the endpoint and the detection rule. Create your first endpoint exception.',
  }
);

export const EXCEPTION_EMPTY_PROMPT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.emptyPromptButtonLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const EXCEPTION_EMPTY_PROMPT_ENDPOINT_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.endpoint.emptyPromptButtonLabel',
  {
    defaultMessage: 'Add endpoint exception',
  }
);

export const EXCEPTION_LOADING_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.loadingExceptionsTitle',
  {
    defaultMessage: 'Loading exceptions',
  }
);

export const EXCEPTION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.exceptionItemsFetchError',
  {
    defaultMessage: 'Unable to load exception items',
  }
);

export const EXCEPTION_ERROR_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.exceptionItemsFetchErrorDescription',
  {
    defaultMessage: 'There was an error loading the exception items. Contact your administrator for help.',
  }
);

export const EXCEPTION_SEARCH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.exceptionItemSearchErrorTitle',
  {
    defaultMessage: 'Error searching',
  }
);

export const EXCEPTION_SEARCH_ERROR_BODY = i18n.translate(
  'xpack.securitySolution.exceptions.viewer.exceptionItemSearchErrorBody',
  {
    defaultMessage: 'An error occurred searching for exception items. Please try again.',
  }
);
