/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  VALUE_LISTS_MODAL_ACTIVATOR,
  VALUE_LIST_CLOSE_BUTTON,
  VALUE_LIST_DELETE_BUTTON,
  VALUE_LIST_EXPORT_BUTTON,
  VALUE_LIST_FILES,
  VALUE_LIST_FILE_PICKER,
  VALUE_LIST_FILE_UPLOAD_BUTTON,
  VALUE_LIST_TYPE_SELECTOR,
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

export const openValueListsModal = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LISTS_MODAL_ACTIVATOR).click();
};

export const closeValueListsModal = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_CLOSE_BUTTON).click();
};

export const selectValueListsFile = (file: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_FILE_PICKER).attachFile(file).trigger('change', { force: true });
};

export const deleteValueListsFile = (file: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_DELETE_BUTTON(file)).click();
};

export const selectValueListType = (type: string): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_TYPE_SELECTOR).select(type);
};

export const uploadValueList = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_FILE_UPLOAD_BUTTON).click();
};

export const exportValueList = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_EXPORT_BUTTON).click();
};

/**
 * Given an array of value lists this will delete them all using Cypress Request and the lists REST API
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-delete-container.html
 */
export const deleteValueLists = (lists: string[]): Array<Cypress.Chainable<Cypress.Response>> => {
  return lists.map((list) => deleteValueList(list));
};

/**
 * Given a single value list this will delete it using Cypress Request and lists REST API
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-delete-container.html
 */
export const deleteValueList = (list: string): Cypress.Chainable<Cypress.Response> => {
  return cy.request({
    method: 'DELETE',
    url: `api/lists?id=${list}`,
    headers: { 'kbn-xsrf': 'delete-lists' },
  });
};

/**
 * Imports a single value list file this using Cypress Request and lists REST API
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-import-list-items.html
 */
export const importValueList = (
  file: string,
  type: string
): Cypress.Chainable<Cypress.Response> => {
  return cy.fixture(file).then((data) => {
    return cy.request({
      method: 'POST',
      url: `api/lists/items/_import?type=${type}`,
      encoding: 'binary',
      headers: {
        'kbn-xsrf': 'upload-value-lists',
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryJLrRH89J8QVArZyv',
      },
      body: `------WebKitFormBoundaryJLrRH89J8QVArZyv\nContent-Disposition: form-data; name="file"; filename="${file}"\n\n${data}`,
    });
  });
};

/**
 * If you are on the value lists from the UI, this will loop over all the HTML elements
 * that have action-delete-value-list-${list_name} and delete all of those value lists
 * using Cypress Request and the lists REST API.
 * If the UI does not contain any value based lists this will not fail. If the UI does
 * contain value based lists but the backend does not return a success on DELETE then this
 * will cause errors.
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-delete-container.html
 */
export const deleteAllValueListsFromUI = (): Array<Cypress.Chainable<Cypress.Response>> => {
  const lists = Cypress.$(VALUE_LIST_FILES)
    .toArray()
    .reduce<string[]>((accum, $el) => {
      const attribute = $el.getAttribute('data-test-subj');
      if (attribute != null) {
        const list = attribute.substr('data-test-subj-value-list'.length);
        return [...accum, list];
      } else {
        return accum;
      }
    }, []);
  return deleteValueLists(lists);
};
