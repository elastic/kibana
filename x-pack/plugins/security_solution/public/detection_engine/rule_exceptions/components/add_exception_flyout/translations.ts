/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CANCEL = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.cancel',
  {
    defaultMessage: 'Cancel',
  }
);

export const CREATE_RULE_EXCEPTION = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.createRuleExceptionLabel',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const ADD_ENDPOINT_EXCEPTION = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.addEndpointException',
  {
    defaultMessage: 'Add Endpoint Exception',
  }
);

export const ADD_EXCEPTION_FETCH_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.fetchError.title',
  {
    defaultMessage: 'Error',
  }
);

export const ADD_EXCEPTION_FETCH_ERROR = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.fetchError',
  {
    defaultMessage: 'Error fetching exception list',
  }
);

export const ADD_EXCEPTION_SEQUENCE_WARNING = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.sequenceWarning',
  {
    defaultMessage:
      "This rule's query contains an EQL sequence statement. The exception created will apply to all events in the sequence.",
  }
);

export const RULE_EXCEPTION_NAME_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.ruleExceptionNameLabel',
  {
    defaultMessage: 'Rule exception name',
  }
);

export const RULE_EXCEPTION_NAME_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.ruleExceptionNamePlaceholder',
  {
    defaultMessage: 'Name your rule exception',
  }
);

export const ADD_TO_LISTS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.addToListsDescription',
  {
    defaultMessage: 'A copy of this exception will be added to each selected list.',
  }
);

export const VIEW_LABEL = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.viewLabel',
  {
    defaultMessage: 'View',
  }
);

export const VIEW_ALL = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.viewAllListsLabel',
  {
    defaultMessage: 'all',
  }
);

export const VIEW_SELECTED = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.viewSelectedListsLabel',
  {
    defaultMessage: 'selected',
  }
);

export const VIEW_RULE_LISTS = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.viewRuleListsLabel',
  {
    defaultMessage: 'this rule',
  }
);

export const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.searchListsPlaceholder',
  {
    defaultMessage: 'Search exception lists',
  }
);

export const SUBMIT_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.createExceptionItem.submitError.title',
  {
    defaultMessage: 'Error adding exception item',
  }
);
