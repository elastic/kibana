/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// / <reference types="cypress" />

// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import { subj as testSubjSelector } from '@kbn/test-subj-selector';

// force ESM in this module
export {};

import 'cypress-react-selector';

Cypress.Commands.addQuery<'getByTestSubj'>(
  'getByTestSubj',
  function getByTestSubj(selector, options) {
    const getFn = cy.now('get', testSubjSelector(selector), options) as (
      subject: Cypress.Chainable<JQuery<HTMLElement>>
    ) => Cypress.Chainable<JQuery<HTMLElement>>;

    return (subject) => getFn(subject);
  }
);

Cypress.Commands.addQuery<'findByTestSubj'>(
  'findByTestSubj',
  function findByTestSubj(selector, options) {
    return (subject) => {
      Cypress.ensure.isElement(subject, this.get('name'), cy);
      return subject.find(testSubjSelector(selector), {});
    };
  }
);

Cypress.Commands.add(
  'waitUntil',
  { prevSubject: 'optional' },
  (subject, fn, { interval = 500, timeout = 30000 } = {}) => {
    let attempts = Math.floor(timeout / interval);

    const completeOrRetry = (result: boolean) => {
      if (result) {
        return result;
      }
      if (attempts < 1) {
        throw new Error(`Timed out while retrying, last result was: {${result}}`);
      }
      cy.wait(interval, { log: false }).then(() => {
        attempts--;
        return evaluate();
      });
    };

    const evaluate = () => {
      const result = fn(subject);

      if (typeof result === 'boolean') {
        return completeOrRetry(result);
      } else if ('then' in result) {
        // @ts-expect-error
        return result.then(completeOrRetry);
      } else {
        throw new Error(
          `Unknown return type from callback: ${Object.prototype.toString.call(result)}`
        );
      }
    };

    return evaluate();
  }
);

Cypress.on('uncaught:exception', () => false);
