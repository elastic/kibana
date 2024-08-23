/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

declare namespace Cypress {
  interface Chainable {
    loginAs(params: {
      username: string;
      password: string;
    }): Cypress.Chainable<Cypress.Response<any>>;
    loginAsViewerUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAsEditorUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAsLogMonitoringUser(): Cypress.Chainable<Cypress.Response<any>>;
    loginAsElastic(): Cypress.Chainable<Cypress.Response<any>>;
    getByTestSubj(selector: string): Chainable<JQuery<Element>>;
    visitKibana(url: string, rangeFrom?: string, rangeTo?: string): void;
    installCustomIntegration(integrationName: string): void;
    deleteIntegration(integrationName: string): void;
    updateInstallationStepStatus(
      onboardingId: string,
      step: InstallationStep,
      status: InstallationStepStatus,
      payload?: ElasticAgentStepPayload
    ): void;
  }
}
