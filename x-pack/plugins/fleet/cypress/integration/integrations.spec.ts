/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INTEGRATIONS, navigateTo } from '../tasks/navigation';
import {
  addIntegration,
  installPackageWithVersion,
  deleteIntegrations,
} from '../tasks/integrations';
import {
  CONFIRM_MODAL_BTN,
  INTEGRATIONS_CARD,
  INTEGRATION_NAME_LINK,
  LATEST_VERSION,
  POLICIES_TAB,
  SETTINGS_TAB,
  UPDATE_PACKAGE_BTN,
} from '../screens/integrations';

describe('Add Integration', () => {
  const integration = 'Apache';

  before(() => {});

  after(() => {
    deleteIntegrations(integration);
  });

  it('should display Apache integration in the Policies list once installed ', () => {
    navigateTo(INTEGRATIONS);
    cy.get(INTEGRATIONS_CARD).contains(integration).click();
    addIntegration();
    cy.get(INTEGRATION_NAME_LINK).contains('apache-');
  });

  it('should upgrade policies with integration update', () => {
    const oldVersion = '0.3.3';
    installPackageWithVersion('apache', oldVersion);
    navigateTo(`app/integrations/detail/apache-${oldVersion}/policies`);

    addIntegration();

    cy.get(INTEGRATION_NAME_LINK).contains('apache-');
    cy.get('.euiText').contains(oldVersion);

    cy.get(SETTINGS_TAB).click();
    cy.get(UPDATE_PACKAGE_BTN).click();
    cy.get(CONFIRM_MODAL_BTN).click();
    cy.get(LATEST_VERSION).then(($title) => {
      const newVersion = $title.text();
      cy.get(POLICIES_TAB).click();
      cy.get('.euiText').contains(`v${oldVersion}`).should('not.exist');
    });
  });
});
