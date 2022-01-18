/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONFIRM_MODAL_BTN } from '../screens/integrations';

describe('Edit settings', () => {
  beforeEach(() => {
    cy.intercept('/api/fleet/settings', {
      item: { id: 'fleet-default-settings', fleet_server_hosts: [] },
    });
    cy.intercept('/api/fleet/outputs', {
      items: [
        {
          id: 'fleet-default-output',
          name: 'default',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
        },
      ],
    });

    cy.visit('/app/fleet/settings');
    cy.getBySel('toastCloseButton').click();
  });

  it('should update hosts', () => {
    cy.getBySel('editHostsBtn').click();
    cy.get('[placeholder="Specify host URL"').type('http://localhost:8220');

    cy.intercept('/api/fleet/settings', {
      item: { id: 'fleet-default-settings', fleet_server_hosts: ['http://localhost:8220'] },
    });
    cy.intercept('PUT', '/api/fleet/settings', {
      fleet_server_hosts: ['http://localhost:8220'],
    }).as('updateSettings');

    cy.getBySel('saveApplySettingsBtn').click();
    cy.getBySel(CONFIRM_MODAL_BTN).click();

    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.fleet_server_hosts[0]).to.equal('http://localhost:8220');
    });
  });

  it('should update outputs', () => {
    cy.getBySel('editOutputBtn').click();
    cy.get('[placeholder="Specify name"').clear().type('output-1');

    cy.intercept('/api/fleet/outputs', {
      items: [
        {
          id: 'fleet-default-output',
          name: 'output-1',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
        },
      ],
    });
    cy.intercept('PUT', '/api/fleet/outputs/fleet-default-output', {
      name: 'output-1',
      type: 'elasticsearch',
      is_default: true,
      is_default_monitoring: true,
    }).as('updateOutputs');

    cy.getBySel('saveApplySettingsBtn').click();
    cy.getBySel(CONFIRM_MODAL_BTN).click();

    cy.wait('@updateOutputs').then((interception) => {
      expect(interception.request.body.name).to.equal('output-1');
    });
  });
});
