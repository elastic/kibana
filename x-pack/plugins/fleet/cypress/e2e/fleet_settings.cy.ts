/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONFIRM_MODAL } from '../screens/navigation';
import {
  SETTINGS_SAVE_BTN,
  SETTINGS_OUTPUTS,
  SETTINGS_FLEET_SERVER_HOSTS,
  FLEET_SERVER_HOST_FLYOUT,
  FLEET_SERVER_SETUP,
  GENERATE_FLEET_SERVER_POLICY_BUTTON,
} from '../screens/fleet';
import { login } from '../tasks/login';

describe('Edit settings', () => {
  beforeEach(() => {
    login();

    cy.intercept('/api/fleet/fleet_server_hosts', {
      items: [
        {
          id: 'fleet-default-settings',
          name: 'Host',
          host_urls: ['https://localhost:8220'],
          is_default: true,
        },
        {
          id: 'fleet-internal-host',
          name: 'Internal Host',
          host_urls: ['https://internal:8220'],
          is_default: false,
          is_internal: true,
        },
      ],
      page: 1,
      perPage: 10000,
      total: 0,
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
  });

  it('should allow to update Fleet server hosts', () => {
    cy.getBySel(SETTINGS_FLEET_SERVER_HOSTS.EDIT_BUTTON).click();

    cy.getBySel(FLEET_SERVER_HOST_FLYOUT.NAME_INPUT).clear().type('Edited Host');

    cy.get('[placeholder="Specify host URL"').clear().type('https://localhost:8221');

    cy.intercept('PUT', '/api/fleet/fleet_server_hosts/fleet-default-settings', {
      name: 'Edited Host',
      host_urls: ['https://localhost:8221'],
      is_default: false,
    }).as('updateFleetServerHosts');

    cy.getBySel(SETTINGS_SAVE_BTN).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.wait('@updateFleetServerHosts').then((interception) => {
      expect(interception.request.body.host_urls[0]).to.equal('https://localhost:8221');
    });
  });

  it('should allow to create new Fleet server hosts', () => {
    cy.getBySel(SETTINGS_FLEET_SERVER_HOSTS.ADD_BUTTON).click();
    cy.getBySel(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
    cy.getBySel(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();

    cy.getBySel(FLEET_SERVER_SETUP.NAME_INPUT).type('New Host');
    cy.getBySel(FLEET_SERVER_SETUP.DEFAULT_SWITCH).click();
    cy.get('[placeholder="Specify host URL"').type('https://localhost:8221');

    cy.intercept('POST', '/api/fleet/fleet_server_hosts', {
      name: 'New Host',
      host_urls: ['https://localhost:8221'],
      is_default: true,
    }).as('updateFleetServerHosts');

    cy.getBySel(GENERATE_FLEET_SERVER_POLICY_BUTTON).click();

    cy.wait('@updateFleetServerHosts').then((interception) => {
      expect(interception.request.body.host_urls[0]).to.equal('https://localhost:8221');
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

  it('should not display internal fleet server hosts', () => {
    cy.getBySel(SETTINGS_FLEET_SERVER_HOSTS.TABLE).should('not.contain', 'Internal Host');
  });
});
