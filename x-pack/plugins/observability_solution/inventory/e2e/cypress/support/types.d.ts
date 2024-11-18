/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare namespace Cypress {
  interface Chainable {
    loginAsSuperUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAs(params: {
      username: string;
      password: string;
    }): Cypress.Chainable<Cypress.Response<any>>;
    getByTestSubj(selector: string): Chainable<JQuery<Element>>;
    visitKibana(url: string): void;
  }
}
