/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { UnwrapPromise } from '@kbn/infra-plugin/common/utility_types';
import type { ReturnTypeFromChainable } from '../types';

type AnyFunction = () => any;

type ReturnTypeFromAnyFunction<Fn extends AnyFunction> = Fn extends () => Promise<any>
  ? UnwrapPromise<ReturnType<Fn>>
  : ReturnType<Fn>;

export const ENDPOINT_VM_NAME = 'ENDPOINT_VM_NAME';

export const API_AUTH = Object.freeze({
  user: Cypress.env('ELASTICSEARCH_USERNAME'),
  pass: Cypress.env('ELASTICSEARCH_PASSWORD'),
});

export const API_HEADERS = Object.freeze({ 'kbn-xsrf': 'cypress' });

export const request = <T = unknown>(
  options: Partial<Cypress.RequestOptions>
): Cypress.Chainable<Cypress.Response<T>> =>
  cy.request<T>({
    auth: API_AUTH,
    headers: API_HEADERS,
    ...options,
  });

/**
 * Wraps a function into a `Cypress.Chainable` that resolves with the value return by that function
 * @param fn
 */
export const createCyChainable = <T extends AnyFunction = AnyFunction>(
  fn: T
): Cypress.Chainable<ReturnTypeFromAnyFunction<T>> => {
  return cy.wrap<ReturnTypeFromAnyFunction<T>>(fn());
};

/**
 * Takes a Cypress Chainable and convert it to a Promise that resolves to the chainable's value
 * @param chain
 */
export const toPromise = <C extends Cypress.Chainable<any> = Cypress.Chainable<any>>(
  chain: C
): Promise<ReturnTypeFromChainable<C>> => {
  return new Promise((resolve, reject) => {
    cy.on('fail', reject);

    try {
      chain.then(resolve);
      cy.off('fail', reject);
    } catch (error) {
      cy.off('fail', reject);
      reject(error);
    }
  });
};
