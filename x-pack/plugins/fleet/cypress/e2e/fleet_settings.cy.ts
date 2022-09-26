/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOAST_CLOSE_BTN, CONFIRM_MODAL } from '../screens/navigation';
import { SETTINGS_SAVE_BTN, SETTINGS_OUTPUTS } from '../screens/fleet';

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
    cy.getBySel(TOAST_CLOSE_BTN).click();
  });

  it('should update Fleet server hosts', () => {
    cy.getBySel(SETTINGS_OUTPUTS.EDIT_HOSTS_BTN).click();
    cy.get('[placeholder="Specify host URL"').type('https://localhost:8220');

    cy.intercept('/api/fleet/settings', {
      item: { id: 'fleet-default-settings', fleet_server_hosts: ['https://localhost:8220'] },
    });
    cy.intercept('PUT', '/api/fleet/settings', {
      fleet_server_hosts: ['https://localhost:8220'],
    }).as('updateSettings');

    cy.getBySel(SETTINGS_SAVE_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.wait('@updateSettings').then((interception) => {
      expect(interception.request.body.fleet_server_hosts[0]).to.equal('https://localhost:8220');
    });
  });

  it('should update outputs', () => {
    cy.getBySel(SETTINGS_OUTPUTS.EDIT_BTN).click();
    cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT).clear().type('output-1');
    cy.get('[placeholder="Specify host URL"').clear().type('http://elasticsearch:9200');

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
      hosts: ['http://elasticsearch:9200'],
      is_default: true,
      is_default_monitoring: true,
    }).as('updateOutputs');

    cy.getBySel(SETTINGS_SAVE_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.wait('@updateOutputs').then((interception) => {
      expect(interception.request.body.name).to.equal('output-1');
    });
  });

  it('should allow to create a logstash output', () => {
    cy.getBySel(SETTINGS_OUTPUTS.ADD_BTN).click();
    cy.getBySel(SETTINGS_OUTPUTS.NAME_INPUT).clear().type('output-logstash-1');
    cy.getBySel(SETTINGS_OUTPUTS.TYPE_INPUT).select('logstash');
    cy.get('[placeholder="Specify host"').clear().type('logstash:5044');
    cy.get('[placeholder="Specify ssl certificate"]').clear().type('SSL CERTIFICATE');
    cy.get('[placeholder="Specify certificate key"]').clear().type('SSL KEY');

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
    cy.intercept('POST', '/api/fleet/outputs', {
      name: 'output-logstash-1',
      type: 'logstash',
      hosts: ['logstash:5044'],
      is_default: false,
      is_default_monitoring: false,
      ssl: {
        certificate: "SSL CERTIFICATE');",
        key: 'SSL KEY',
      },
    }).as('postLogstashOutput');

    cy.getBySel(SETTINGS_SAVE_BTN).click();

    cy.wait('@postLogstashOutput').then((interception) => {
      expect(interception.request.body.name).to.equal('output-logstash-1');
    });
  });
});
