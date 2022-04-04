/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const createListsIndex = () => {
  cy.request({
    method: 'POST',
    url: '/api/lists/index',
    headers: { 'kbn-xsrf': 'cypress-creds' },
    failOnStatusCode: false,
  });
};

export const waitForListsIndex = () => {
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
  return cy.get(VALUE_LISTS_MODAL_ACTIVATOR).click({ force: true });
};

export const closeValueListsModal = (): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy.get(VALUE_LIST_CLOSE_BUTTON).click({ force: true });
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
export const deleteValueLists = (
  lists: string[]
): Array<Cypress.Chainable<Cypress.Response<unknown>>> => {
  return lists.map((list) => deleteValueList(list));
};

/**
 * Given a single value list this will delete it using Cypress Request and lists REST API
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-delete-container.html
 */
export const deleteValueList = (list: string): Cypress.Chainable<Cypress.Response<unknown>> => {
  return cy.request({
    method: 'DELETE',
    url: `api/lists?id=${list}`,
    headers: { 'kbn-xsrf': 'delete-lists' },
  });
};

/**
 * Uploads list items using Cypress Request and lists REST API.
 *
 * This also will remove any upload data such as empty strings that can happen from the fixture
 * due to extra lines being added from formatters such as prettier.
 * @param file The file name to import
 * @param type The type of the file import such as ip/keyword/text etc...
 * @param data The contents of the file
 * @param testSuggestions The type of test to use rather than the fixture file which is useful for ranges
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-import-list-items.html
 */
export const uploadListItemData = (
  file: string,
  type: string,
  data: string
): Cypress.Chainable<Cypress.Response<unknown>> => {
  const removedEmptyLines = data
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');

  return cy
    .request({
      method: 'POST',
      url: `api/lists/items/_import?type=${type}`,
      encoding: 'binary',
      headers: {
        'kbn-xsrf': 'upload-value-lists',
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryJLrRH89J8QVArZyv',
      },
      body: `------WebKitFormBoundaryJLrRH89J8QVArZyv\nContent-Disposition: form-data; name="file"; filename="${file}"\n\n${removedEmptyLines}`,
      retryOnStatusCodeFailure: true,
    })
    .then(() => {
      cy.wait(1000);
    });
};

/**
 * Checks a single value list file against a data set to ensure it has been uploaded.
 *
 * You can optionally pass in an array of test suggestions which will be useful for if you are
 * using a range such as a CIDR range and need to ensure that test range has been added to the
 * list but you cannot run an explicit test against that range.
 *
 * This also will remove any upload data such as empty strings that can happen from the fixture
 * due to extra lines being added from formatters.
 * @param file The file that was imported
 * @param data The contents to check unless testSuggestions is given.
 * @param type The type of the file import such as ip/keyword/text etc...
 * @param testSuggestions The type of test to use rather than the fixture file which is useful for ranges
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-import-list-items.html
 */
export const checkListItemData = (
  file: string,
  data: string,
  testSuggestions: string[] | undefined
): Cypress.Chainable<JQuery<HTMLElement>> => {
  const importCheckLines =
    testSuggestions == null
      ? data.split('\n').filter((line) => line.trim() !== '')
      : testSuggestions;

  return cy.wrap(importCheckLines).each((line) => {
    return cy
      .request({
        retryOnStatusCodeFailure: true,
        method: 'GET',
        url: `api/lists/items?list_id=${file}&value=${line}`,
      })
      .then((resp) => {
        expect(resp.status).to.eq(200);
      });
  });
};

/**
 * Imports a single value list file this using Cypress Request and lists REST API. After it
 * imports the data, it will re-check and ensure that the data is there before continuing to
 * get us more deterministic.
 *
 * You can optionally pass in an array of test suggestions which will be useful for if you are
 * using a range such as a CIDR range and need to ensure that test range has been added to the
 * list but you cannot run an explicit test against that range.
 *
 * This also will remove any upload data such as empty strings that can happen from the fixture
 * due to extra lines being added from formatters.
 * @param file The file to import
 * @param type The type of the file import such as ip/keyword/text etc...
 * @param testSuggestions The type of test to use rather than the fixture file which is useful for ranges
 * Ref: https://www.elastic.co/guide/en/security/current/lists-api-import-list-items.html
 */
export const importValueList = (
  file: string,
  type: string,
  testSuggestions: string[] | undefined = undefined
): Cypress.Chainable<JQuery<HTMLElement>> => {
  return cy
    .fixture<string>(file)
    .then((data) => uploadListItemData(file, type, data))
    .fixture<string>(file)
    .then((data) => checkListItemData(file, data, testSuggestions));
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
export const deleteAllValueListsFromUI = (): Array<
  Cypress.Chainable<Cypress.Response<unknown>>
> => {
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
