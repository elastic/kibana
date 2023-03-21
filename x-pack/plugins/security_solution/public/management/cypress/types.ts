/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type PossibleChainable =
  | Cypress.Chainable<any>
  | ((args?: any) => Cypress.Chainable<any>)
  | ((args?: any) => Promise<Cypress.Chainable<any>>);

/**
 * Extracts out the subject that the Chainable resolves to (when `Chainable.then()` is used).
 *
 * @example
 * // With a Cypress.chainable object
 * const value: Cypress.Chainable<SomeType>;
 * const t: ReturnTypeFromChainable<value>; // SomeType
 *
 * // With function
 * const value: () => Cypress.Chainable<SomeType>;
 * const t: ReturnTypeFromChainable<value>; // SomeType
 *
 * // With function that returns a promise
 * const value: () => Promise<Cypress.Chainable<SomeType>>;
 * const t: ReturnTypeFromChainable<value>; // SomeType
 */
export type ReturnTypeFromChainable<C extends PossibleChainable> = C extends Cypress.Chainable<
  infer Value
>
  ? Value
  : C extends (args?: any) => Cypress.Chainable<infer ValueFromFnResponse>
  ? ValueFromFnResponse
  : C extends (args?: any) => Promise<Cypress.Chainable<infer ValueFromPromiseChainable>>
  ? ValueFromPromiseChainable
  : never;
