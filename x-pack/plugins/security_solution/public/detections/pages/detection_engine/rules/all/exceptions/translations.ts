/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EXCEPTION_LIST_ID_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.idTitle',
  {
    defaultMessage: 'List ID',
  }
);

export const EXCEPTION_LIST_NAME = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.listName',
  {
    defaultMessage: 'Name',
  }
);

export const EXCEPTION_LIST_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.actionsTitle',
  {
    defaultMessage: 'Actions',
  }
);

export const NUMBER_RULES_ASSIGNED_TO_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.numberRulesAssignedTitle',
  {
    defaultMessage: 'Number of rules assigned to',
  }
);

export const RULES_ASSIGNED_TO_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.rulesAssignedTitle',
  {
    defaultMessage: 'Rules assigned to',
  }
);

export const showMoreRules = (rulesCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.rules.all.exceptions.rulesPopoverButton', {
    defaultMessage: '+{rulesCount} {rulesCount, plural, =1 {Rule} other {Rules}}',
    values: { rulesCount },
  });

export const LIST_DATE_CREATED_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.dateCreatedTitle',
  {
    defaultMessage: 'Date created',
  }
);

export const LIST_DATE_UPDATED_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.dateUpdatedTitle',
  {
    defaultMessage: 'Last edited',
  }
);

export const ERROR_EXCEPTION_LISTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.errorFetching',
  {
    defaultMessage: 'Error fetching exception lists',
  }
);

export const NO_EXCEPTION_LISTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptionLists.filters.noExceptionsTitle',
  {
    defaultMessage: 'No exception lists found',
  }
);

export const EXCEPTIONS_LISTS_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptionLists.search.placeholder',
  {
    defaultMessage: 'Search exception lists',
  }
);

export const ALL_EXCEPTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptions.tableTitle',
  {
    defaultMessage: 'Exception lists',
  }
);

export const NO_LISTS_BODY = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.allExceptions.filters.noListsBody',
  {
    defaultMessage: "We weren't able to find any exception lists.",
  }
);

export const EXCEPTION_EXPORT_SUCCESS = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.exportSuccess',
  {
    defaultMessage: 'Exception list export success',
  }
);

export const EXCEPTION_EXPORT_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.exportError',
  {
    defaultMessage: 'Exception list export error',
  }
);

export const EXCEPTION_DELETE_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.rules.all.exceptions.deleteError',
  {
    defaultMessage: 'Error occurred deleting exception list',
  }
);

export const exceptionDeleteSuccessMessage = (listId: string) =>
  i18n.translate('xpack.securitySolution.exceptions.referenceModalSuccessDescription', {
    defaultMessage: 'Exception list - {listId} - deleted successfully.',
    values: { listId },
  });

export const REFERENCE_MODAL_TITLE = i18n.translate(
  'xpack.securitySolution.exceptions.referenceModalTitle',
  {
    defaultMessage: 'Remove exception list',
  }
);

export const REFERENCE_MODAL_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.referenceModalCancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const REFERENCE_MODAL_CONFIRM_BUTTON = i18n.translate(
  'xpack.securitySolution.exceptions.referenceModalDeleteButton',
  {
    defaultMessage: 'Remove exception list',
  }
);

export const referenceErrorMessage = (referenceCount: number) =>
  i18n.translate('xpack.securitySolution.exceptions.referenceModalDescription', {
    defaultMessage:
      'This exception list is associated with ({referenceCount}) {referenceCount, plural, =1 {rule} other {rules}}. Removing this exception list will also remove its reference from the associated rules.',
    values: { referenceCount },
  });

export const EXCEPTION_LIST_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.exceptions.searchPlaceholder',
  {
    defaultMessage: 'e.g. Example List Name',
  }
);
