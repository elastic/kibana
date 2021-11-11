/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare namespace Cypress {
  interface Chainable {
    loginAsReadOnlyUser(): void;
    loginAsPowerUser(): void;
    loginAs(params: { username: string; password: string }): void;
    changeTimeRange(value: string): void;
    selectAbsoluteTimeRange(start: string, end: string): void;
    expectAPIsToHaveBeenCalledWith(params: {
      apisIntercepted: string[];
      value: string;
    }): void;
  }
}
