/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CREATE_EXCEPTION_LIST_MODAL_TITLE = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.modalTitle', {
  defaultMessage: 'Create exception list',
});

export const EXCEPTION_LIST_NAME_LABEL = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.nameLabel', {
  defaultMessage: 'Exception list name',
});

export const EXCEPTION_LIST_NAME_PLACEHOLDER = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.namePlaceholder', {
  defaultMessage: 'Add a name',
});

export const EXCEPTION_LIST_DESCRIPTION_LABEL = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.descriptionLabel', {
  defaultMessage: 'Description (optional)',
});

export const EXCEPTION_LIST_DESCRIPTION_PLACEHOLDER = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.descriptionPlaceholder', {
  defaultMessage: 'Add a description',
});

export const CREATE_EXCEPTION_LIST_BUTTON = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.createExceptionListButton', {
  defaultMessage: 'Create exception list',
});

export const FIRST_LINKED_LIST_CALLOUT_TITLE = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.firstLinkedListCalloutTitle', {
  defaultMessage: "You don't have an exception list linked to this rule",
});

export const FIRST_LINKED_LIST_CALLOUT_BODY = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.firstLinkedListCalloutBody', {
  defaultMessage: 'You need to create an exception list first. If you would like to create an exception for an existing list, go to Manage --> Exception lists page.',
});

export const exceptionListCreateSuccessMessage = (listId: string) =>
  i18n.translate('xpack.securitySolution.createExceptionList.successToastMessage', {
    defaultMessage: 'Exception list - {listId} - created successfully.',
    values: { listId },
  });

  export const EXCEPTION_LIST_CREATE_TOAST_ERROR = i18n.translate('xpack.securitySolution.exceptions.createExceptionList.errorToastMessage', {
    defaultMessage: "Unable to create list",
  });