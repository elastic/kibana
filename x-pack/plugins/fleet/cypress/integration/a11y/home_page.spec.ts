/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'cypress-real-events/support';
import { checkA11y } from '../../support/commands';
import { FLEET, navigateTo } from '../../tasks/navigation';
import { GENERATE_FLEET_SERVER_POLICY_BUTTON, QUICK_START_TAB_BUTTON } from '../../screens/fleet';
describe('Home page', () => {
  before(() => {
    navigateTo(FLEET);
    cy.getBySel(QUICK_START_TAB_BUTTON, { timeout: 15000 }).should('be.visible');
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
        checkA11y({ skipFailures: false });
      });
    });
    //     describe('Advanced', async () => {
    //         before(async () => {
    //             await pageObjects.fleet.clickAdvanceOption();
    //         });
    //         it('Select policy for fleet', async () => {
    //             await a11y.testAppSnapshot();
    //         });
    //         it('Add your fleet sever host', async () => {
    //             await pageObjects.fleet.addFleetServerInAdvanced();
    //             await a11y.testAppSnapshot();
    //         });
    //         it('Generate service token', async () => {
    //             await pageObjects.fleet.addGeneratedServiceToken();
    //             await a11y.testAppSnapshot();
    //         });
    //     });
  });

  // it('should edit package policy', () => {
  // cy.getBySel('toastCloseButton').click();
  // cy.getBySel('packagePolicyDescriptionInput').clear().type('desc');
  // cy.intercept('PUT', '/api/fleet/package_policies/policy-1', {
  //     name: 'fleet_server-1',
  //     description: 'desc',
  //     namespace: 'default',
  // }).as('updatePackagePolicy');
  // cy.get('.euiButton').contains('Save integration').click();
  // cy.wait('@updatePackagePolicy').then((interception) => {
  //     expect(interception.request.body.description).to.equal('desc');
  // });
  // });
});
