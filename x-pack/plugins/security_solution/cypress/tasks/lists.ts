/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  VALUE_LISTS_MODAL_ACTIVATOR,
  VALUE_LIST_FILE_PICKER,
  VALUE_LIST_FILE_UPLOAD_BUTTON,
} from '../screens/lists';

export const waitForListsIndexToBeCreated = () => {
  cy.request({ url: '/api/lists/index', retryOnStatusCodeFailure: true }).then((response) => {
    if (response.status !== 200) {
      cy.wait(7500);
    }
  });
};

export const waitForValueListsModalToBeLoaded = () => {
  cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('exist');
  cy.get(VALUE_LISTS_MODAL_ACTIVATOR).should('not.be.disabled');
};

export const openValueListsModal = () => {
  cy.get(VALUE_LISTS_MODAL_ACTIVATOR).click();
};

export const selectValueListsFile = () => {
  cy.get(VALUE_LIST_FILE_PICKER).attachFile('value_list.txt').trigger('change', { force: true });
};

export const uploadValueList = () => {
  cy.get(VALUE_LIST_FILE_UPLOAD_BUTTON).click();
};
