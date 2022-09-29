/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'cypress-real-events/support';
import { Interception } from 'cypress/types/net-stubbing';
import 'cypress-axe';
import moment from 'moment';
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';
import { ApmUsername } from '../../../server/test_helpers/create_apm_users/authentication';

Cypress.Commands.add('loginAsViewerUser', () => {
  return cy.loginAs({ username: ApmUsername.viewerUser, password: 'changeme' });
});

Cypress.Commands.add('loginAsEditorUser', () => {
  return cy.loginAs({ username: ApmUsername.editorUser, password: 'changeme' });
});

Cypress.Commands.add('loginAsMonitorUser', () => {
  return cy.loginAs({
    username: ApmUsername.apmMonitorIndices,
    password: 'changeme',
  });
});

Cypress.Commands.add(
  'loginAs',
  ({ username, password }: { username: string; password: string }) => {
    // cy.session(username, () => {
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
      // });
    });
    cy.visit('/');
  }
);

Cypress.Commands.add('changeTimeRange', (value: string) => {
  cy.get('[data-test-subj="superDatePickerToggleQuickMenuButton"]').click();
  cy.contains(value).click();
});

Cypress.Commands.add('visitKibana', (url: string) => {
  cy.visit(url);
  cy.get('[data-test-subj="kbnLoadingMessage"]').should('exist');
  cy.get('[data-test-subj="kbnLoadingMessage"]').should('not.exist', {
    timeout: 50000,
  });
});

Cypress.Commands.add(
  'selectAbsoluteTimeRange',
  (start: string, end: string) => {
    const format = 'MMM D, YYYY @ HH:mm:ss.SSS';

    cy.get('[data-test-subj="superDatePickerstartDatePopoverButton"]').click();
    cy.get('[data-test-subj="superDatePickerAbsoluteDateInput"]')
      .eq(0)
      .clear({ force: true })
      .type(moment(start).format(format), { force: true });
    cy.get('[data-test-subj="superDatePickerendDatePopoverButton"]').click();
    cy.get('[data-test-subj="superDatePickerAbsoluteDateInput"]')
      .eq(1)
      .clear({ force: true })
      .type(moment(end).format(format), { force: true });
  }
);

Cypress.Commands.add(
  'expectAPIsToHaveBeenCalledWith',
  ({
    apisIntercepted,
    value,
  }: {
    apisIntercepted: string[];
    value: string;
  }) => {
    cy.wait(apisIntercepted).then((interceptions) => {
      if (Array.isArray(interceptions)) {
        interceptions.map((interception) => {
          expect(interception.request.url).include(value);
        });
      } else {
        expect((interceptions as Interception).request.url).include(value);
      }
    });
  }
);

Cypress.Commands.add(
  'updateAdvancedSettings',
  (settings: Record<string, unknown>) => {
    const kibanaUrl = Cypress.env('KIBANA_URL');
    cy.request({
      log: false,
      method: 'POST',
      url: `${kibanaUrl}/api/kibana/settings`,
      body: { changes: settings },
      headers: {
        'kbn-xsrf': 'e2e_test',
      },
      auth: { user: 'editor', pass: 'changeme' },
    });
  }
);

// A11y configuration

const axeConfig = {
  ...AXE_CONFIG,
};
const axeOptions = {
  ...AXE_OPTIONS,
  runOnly: [...AXE_OPTIONS.runOnly, 'best-practice'],
};

export const checkA11y = ({ skipFailures }: { skipFailures: boolean }) => {
  // https://github.com/component-driven/cypress-axe#cychecka11y
  cy.injectAxe();
  cy.configureAxe(axeConfig);
  const context = '.kbnAppWrapper'; // Scopes a11y checks to only our app
  /**
   * We can get rid of the last two params when we don't need to add skipFailures
   * params = (context, options, violationCallback, skipFailures)
   */
  cy.checkA11y(context, axeOptions, undefined, skipFailures);
};
