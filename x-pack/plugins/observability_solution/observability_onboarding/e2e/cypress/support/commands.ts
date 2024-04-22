/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import URL from 'url';
import { ObservabilityOnboardingUsername } from '../../../server/test_helpers/create_observability_onboarding_users/authentication';

export type InstallationStep =
  | 'ea-download'
  | 'ea-extract'
  | 'ea-install'
  | 'ea-status'
  | 'ea-config';

export type InstallationStepStatus =
  | 'incomplete'
  | 'complete'
  | 'disabled'
  | 'loading'
  | 'warning'
  | 'danger'
  | 'current';

Cypress.Commands.add('loginAsViewerUser', () => {
  return cy.loginAs({
    username: ObservabilityOnboardingUsername.viewerUser,
    password: 'changeme',
  });
});

Cypress.Commands.add('loginAsEditorUser', () => {
  return cy.loginAs({
    username: ObservabilityOnboardingUsername.editorUser,
    password: 'changeme',
  });
});

Cypress.Commands.add('loginAsLogMonitoringUser', () => {
  return cy.loginAs({
    username: ObservabilityOnboardingUsername.logMonitoringUser,
    password: 'changeme',
  });
});

Cypress.Commands.add('loginAsElastic', () => {
  return cy.loginAs({
    username: 'elastic',
    password: 'changeme',
  });
});

Cypress.Commands.add(
  'loginAs',
  ({ username, password }: { username: string; password: string }) => {
    const kibanaUrl = Cypress.env('KIBANA_URL');
    cy.log(`Logging in as ${username} on ${kibanaUrl}`);
    cy.visit('/');
    cy.request({
      log: true,
      method: 'POST',
      url: `${kibanaUrl}/internal/security/login`,
      body: {
        providerType: 'basic',
        providerName: 'basic',
        currentURL: `${kibanaUrl}/login`,
        params: { username, password },
      },
      headers: {
        'kbn-xsrf': 'e2e_test',
      },
    });
    cy.visit('/');
  }
);

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj="${selector}"]`);
});

Cypress.Commands.add(
  'visitKibana',
  (url: string, rangeFrom?: string, rangeTo?: string) => {
    const urlPath = URL.format({
      pathname: url,
      query: { rangeFrom, rangeTo },
    });

    cy.visit(urlPath);
    cy.getByTestSubj('kbnLoadingMessage').should('exist');
    cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
      timeout: 50000,
    });
  }
);

Cypress.Commands.add('installCustomIntegration', (integrationName: string) => {
  const kibanaUrl = Cypress.env('KIBANA_URL');

  cy.request({
    log: false,
    method: 'POST',
    url: `${kibanaUrl}/api/fleet/epm/custom_integrations`,
    body: {
      force: true,
      integrationName,
      datasets: [
        { name: `${integrationName}.access`, type: 'logs' },
        { name: `${integrationName}.error`, type: 'metrics' },
        { name: `${integrationName}.warning`, type: 'logs' },
      ],
    },
    headers: {
      'kbn-xsrf': 'e2e_test',
      'Elastic-Api-Version': '2023-10-31',
    },
    auth: { user: 'editor', pass: 'changeme' },
  });
});

Cypress.Commands.add('deleteIntegration', (integrationName: string) => {
  const kibanaUrl = Cypress.env('KIBANA_URL');

  cy.request({
    log: false,
    method: 'GET',
    url: `${kibanaUrl}/api/fleet/epm/packages/${integrationName}`,
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
    auth: { user: 'editor', pass: 'changeme' },
    failOnStatusCode: false,
  }).then((response) => {
    const status = response.body.item?.status;
    if (status === 'installed') {
      cy.request({
        log: false,
        method: 'DELETE',
        url: `${kibanaUrl}/api/fleet/epm/packages/${integrationName}`,
        body: {
          force: false,
        },
        headers: {
          'kbn-xsrf': 'e2e_test',
          'Elastic-Api-Version': '2023-10-31',
        },
        auth: { user: 'editor', pass: 'changeme' },
      });
    }
  });
});

Cypress.Commands.add(
  'updateInstallationStepStatus',
  (
    onboardingId: string,
    step: InstallationStep,
    status: InstallationStepStatus
  ) => {
    const kibanaUrl = Cypress.env('KIBANA_URL');

    cy.log(onboardingId, step, status);

    cy.request({
      log: false,
      method: 'POST',
      url: `${kibanaUrl}/internal/observability_onboarding/flow/${onboardingId}/step/${step}`,
      headers: {
        'kbn-xsrf': 'e2e_test',
      },
      auth: { user: 'editor', pass: 'changeme' },
      body: {
        status,
      },
    });
  }
);
