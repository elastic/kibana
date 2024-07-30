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
import '@frsource/cypress-plugin-visual-regression-diff';
import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/axe-config';
import { ApmUsername } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';

Cypress.Commands.add('loginAsSuperUser', () => {
  return cy.loginAs({ username: 'elastic', password: 'changeme' });
});

Cypress.Commands.add('loginAsViewerUser', () => {
  return cy.loginAs({ username: ApmUsername.viewerUser, password: 'changeme' });
});

Cypress.Commands.add('loginAsEditorUser', () => {
  return cy.loginAs({ username: ApmUsername.editorUser, password: 'changeme' });
});

Cypress.Commands.add('loginAsMonitorUser', () => {
  return cy.loginAs({
    username: ApmUsername.apmMonitorClusterAndIndices,
    password: 'changeme',
  });
});

Cypress.Commands.add('loginAsApmManageOwnAndCreateAgentKeys', () => {
  return cy.loginAs({
    username: ApmUsername.apmManageOwnAndCreateAgentKeys,
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

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj="${selector}"]`);
});

Cypress.Commands.add('changeTimeRange', (value: string) => {
  cy.getByTestSubj('superDatePickerToggleQuickMenuButton').click();
  cy.contains(value).click();
});

Cypress.Commands.add('visitKibana', (url: string) => {
  cy.visit(url);
  cy.getByTestSubj('kbnLoadingMessage').should('exist');
  cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
    timeout: 50000,
  });
});

// This command expects from and to both values to be present on the URL where
// this command is being executed. If from and to values are not present,
// the date picker renders singleValueInput where this command won't work.
Cypress.Commands.add('selectAbsoluteTimeRange', (start: string, end: string) => {
  const format = 'MMM D, YYYY @ HH:mm:ss.SSS';

  cy.getByTestSubj('superDatePickerstartDatePopoverButton').click();
  cy.contains('Start date')
    .nextAll()
    .find('[data-test-subj="superDatePickerAbsoluteDateInput"]')
    .clear({ force: true })
    .type(moment(start).format(format), { force: true })
    .type('{enter}');

  cy.getByTestSubj('superDatePickerendDatePopoverButton').click();
  cy.contains('End date')
    .nextAll()
    .find('[data-test-subj="superDatePickerAbsoluteDateInput"]')
    .clear({ force: true })
    .type(moment(end).format(format), { force: true })
    .type('{enter}');
});

Cypress.Commands.add(
  'expectAPIsToHaveBeenCalledWith',
  ({ apisIntercepted, value }: { apisIntercepted: string[]; value: string }) => {
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

Cypress.Commands.add('updateAdvancedSettings', (settings: Record<string, unknown>) => {
  const kibanaUrl = Cypress.env('KIBANA_URL');
  cy.request({
    log: false,
    method: 'POST',
    url: `${kibanaUrl}/internal/kibana/settings`,
    body: { changes: settings },
    headers: {
      'kbn-xsrf': 'e2e_test',
    },
    auth: { user: 'editor', pass: 'changeme' },
  });
});

Cypress.Commands.add('dismissServiceGroupsTour', () => {
  window.localStorage.setItem(
    'apm.serviceGroupsTour',
    JSON.stringify({
      createGroup: false,
      editGroup: false,
    })
  );
});

Cypress.Commands.add('withHidden', (selector, callback) => {
  cy.get(selector).invoke('attr', 'style', 'display: none');
  callback();
  cy.get(selector).invoke('attr', 'style', '');
});

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
