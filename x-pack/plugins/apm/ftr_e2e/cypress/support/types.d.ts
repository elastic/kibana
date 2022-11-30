/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare namespace Cypress {
  interface Chainable {
    loginAsViewerUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAsEditorUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAsMonitorUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAs(params: {
      username: string;
      password: string;
    }): Cypress.Chainable<Cypress.Response<any>>;
    changeTimeRange(value: string): void;
    visitKibana(url: string): void;
    selectAbsoluteTimeRange(start: string, end: string): void;
    expectAPIsToHaveBeenCalledWith(params: {
      apisIntercepted: string[];
      value: string;
    }): void;
    updateAdvancedSettings(settings: Record<string, unknown>): void;
    getByTestSubj(selector: string): Chainable<JQuery<Element>>;
    dismissServiceGroupsTour(): void;
  }
}
