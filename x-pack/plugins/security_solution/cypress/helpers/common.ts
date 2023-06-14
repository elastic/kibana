/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper function to generate selector by data-test-subj
 * @param dataTestSubjectValue the value passed to the data-test-subj property of the DOM element
 */
export const getDataTestSubjectSelector = (dataTestSubjectValue: string) =>
  `[data-test-subj="${dataTestSubjectValue}"]`;

/**
 * Helper function to generate selector by data-test-subj that start with the value
 * @param dataTestSubjectValue the partial value passed to the data-test-subj property of the DOM element
 */
export const getDataTestSubjectSelectorStartWith = (dataTestSubjectValue: string) =>
  `[data-test-subj^="${dataTestSubjectValue}"]`;

/**
 * Helper function to generate selector by class
 * @param className the value passed to class property of the DOM element
 */
export const getClassSelector = (className: string) => `.${className}`;

export const getLocalstorageEntryAsObject = (storage: Cypress.StorageByOrigin, field: string) => {
  // baseUrl value from x-pack/plugins/security_solution/cypress/cypress.config.ts
  const envLocalstorage = storage?.[Cypress.config('baseUrl') as string];
  let result;
  if (envLocalstorage && envLocalstorage[field]) {
    try {
      result = JSON.parse(envLocalstorage[field] as string);
    } catch {
      result = undefined;
    }
  }
  return result;
};
