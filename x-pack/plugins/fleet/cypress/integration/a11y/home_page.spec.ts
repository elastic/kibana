/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'cypress-real-events/support';
import { checkA11y } from '../../support/commands';
import { FLEET, navigateTo } from '../../tasks/navigation';
import {
  GENERATE_FLEET_SERVER_POLICY_BUTTON,
  AGENTS_QUICK_START_TAB_BUTTON,
  PLATFORM_TYPE_LINUX_BUTTON,
  AGENTS_ADVANCED_TAB_BUTTON,
  ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON,
  ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON,
} from '../../screens/fleet';
describe('Home page', () => {
  before(() => {
    navigateTo(FLEET);
    cy.getBySel(AGENTS_QUICK_START_TAB_BUTTON, { timeout: 15000 }).should('be.visible');
  });
  describe('Agents', () => {
    const fleetServerHost = 'https://localhost:8220';
    describe('Quick Start', () => {
      it('Get started with fleet', () => {
        checkA11y({ skipFailures: false });
      });
      it('Install Fleet Server', () => {
        cy.getBySel('fleetServerHostInput').getBySel('comboBoxSearchInput').type(fleetServerHost);
        cy.getBySel(GENERATE_FLEET_SERVER_POLICY_BUTTON).click();
        cy.getBySel(PLATFORM_TYPE_LINUX_BUTTON, { timeout: 15000 }).should('be.visible');
        checkA11y({ skipFailures: false });
      });
    });
    describe('Advanced', () => {
      before(() => {
        cy.getBySel(AGENTS_ADVANCED_TAB_BUTTON).click();
      });
      it('Select policy for fleet', () => {
        checkA11y({ skipFailures: false });
      });
      it('Add your fleet sever host', () => {
        cy.getBySel(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON).click();
        checkA11y({ skipFailures: false });
      });
      it('Generate service token', () => {
        cy.getBySel(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON, { timeout: 15000 }).should('be.visible');
        cy.getBySel(ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON).click();
        cy.getBySel(PLATFORM_TYPE_LINUX_BUTTON, { timeout: 15000 }).should('be.visible');
        checkA11y({ skipFailures: false });
      });
    });
  });
});
