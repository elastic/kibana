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
// Commenting this out since it's breaking the tests. It was caused by https://github.com/elastic/kibana/commit/bef90a58663b6c4b668a7fe0ce45a002fb68c474#diff-8a4659c6955a712376fe5ca0d81636164d1b783a63fe9d1a23da4850bd0dfce3R10
// import { AXE_CONFIG, AXE_OPTIONS } from '@kbn/test';

Cypress.Commands.add('loginAsReadOnlyUser', () => {
  cy.loginAs({ username: 'apm_read_user', password: 'changeme' });
});

Cypress.Commands.add('loginAsPowerUser', () => {
  cy.loginAs({ username: 'apm_power_user', password: 'changeme' });
});

Cypress.Commands.add(
  'loginAs',
  ({ username, password }: { username: string; password: string }) => {
    cy.log(`Logging in as ${username}`);
    const kibanaUrl = Cypress.env('KIBANA_URL');
    cy.request({
      log: false,
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
  }
);

Cypress.Commands.add('changeTimeRange', (value: string) => {
  cy.get('[data-test-subj="superDatePickerToggleQuickMenuButton"]').click();
  cy.contains(value).click();
});

Cypress.Commands.add(
  'selectAbsoluteTimeRange',
  (start: string, end: string) => {
    const format = 'MMM D, YYYY @ HH:mm:ss.SSS';

    cy.get('[data-test-subj="superDatePickerstartDatePopoverButton"]').click();
    cy.get('[data-test-subj="superDatePickerAbsoluteDateInput"]')
      .eq(0)
      .clear()
      .type(moment(start).format(format), { force: true });
    cy.get('[data-test-subj="superDatePickerendDatePopoverButton"]').click();
    cy.get('[data-test-subj="superDatePickerAbsoluteDateInput"]')
      .eq(1)
      .clear()
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

// A11y configuration

const axeConfig = {
  // See comment on line 11
  // ...AXE_CONFIG,
};
const axeOptions = {
  // See comment on line 11
  // ...AXE_OPTIONS,
  // runOnly: [...AXE_OPTIONS.runOnly, 'best-practice'],
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
