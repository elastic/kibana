/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  SETTINGS_TAB,
  AGENT_BINARY_SOURCES_TABLE,
  AGENT_BINARY_SOURCES_TABLE_ACTIONS,
  AGENT_BINARY_SOURCES_FLYOUT,
  AGENT_POLICY_FORM,
} from '../screens/fleet';
import { cleanupDownloadSources } from '../tasks/cleanup';
import { FLEET, navigateTo } from '../tasks/navigation';
import { CONFIRM_MODAL } from '../screens/navigation';

describe('Agent binary download source section', () => {
  beforeEach(() => {
    cleanupDownloadSources();
    navigateTo(FLEET);
  });

  it('has a default value and allows to edit an existing object', () => {
    cy.getBySel(SETTINGS_TAB).click();

    cy.getBySel(AGENT_BINARY_SOURCES_TABLE).find('tr').should('have.length', '2');
    cy.getBySel(AGENT_BINARY_SOURCES_TABLE_ACTIONS.HOST).contains(
      'https://artifacts.elastic.co/downloads/'
    );
    cy.getBySel(AGENT_BINARY_SOURCES_TABLE_ACTIONS.DEFAULT_VALUE).should('exist');
    cy.getBySel(AGENT_BINARY_SOURCES_TABLE_ACTIONS.EDIT).click();
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).clear().type('New Name');
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT)
      .clear()
      .type('https://edited-default-host.co');
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON).click();
    cy.getBySel(CONFIRM_MODAL.CONFIRM_BUTTON).click();

    cy.intercept('api/fleet/agent_download_sources/fleet-default-download-source', {
      host: 'https://edited-default-host.co',
      is_default: true,
      name: 'New Name',
    });
  });

  it('allows to create new download source objects', () => {
    cy.getBySel(SETTINGS_TAB).click();

    cy.getBySel(AGENT_BINARY_SOURCES_TABLE_ACTIONS.ADD).click();
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).clear().type('New Host');
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT).clear().type('https://new-test-host.co');
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON).click();
    cy.getBySel(AGENT_BINARY_SOURCES_TABLE).find('tr').should('have.length', '3');
    cy.intercept('api/fleet/agent_download_sources', {
      name: 'New Host',
      is_default: false,
      host: 'https://new-test-host.co',
    });

    cy.getBySel(AGENT_BINARY_SOURCES_TABLE_ACTIONS.ADD).click();
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.NAME_INPUT).clear().type('New Default Host');
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.HOST_INPUT).clear().type('https://new-default-host.co');
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.IS_DEFAULT_SWITCH).click();
    cy.getBySel(AGENT_BINARY_SOURCES_FLYOUT.SUBMIT_BUTTON).click();

    cy.intercept('api/fleet/agent_download_sources', {
      name: 'New Default Host',
      is_default: true,
      host: 'https://new-default-host.co',
    });
  });

  it('the download source is displayed in agent policy settings', () => {
    cy.request({
      method: 'POST',
      url: `api/fleet/agent_download_sources`,
      body: {
        name: 'Custom Host',
        id: 'fleet-local-registry',
        host: 'https://new-custom-host.co',
      },
      headers: { 'kbn-xsrf': 'kibana' },
    });
    cy.request({
      method: 'POST',
      url: '/api/fleet/agent_policies',
      body: {
        name: 'Test Agent policy',
        namespace: 'default',
        description: '',
        monitoring_enabled: ['logs', 'metrics'],
        id: 'new-agent-policy',
        download_source_id: 'fleet-local-registry',
      },
      headers: { 'kbn-xsrf': 'kibana' },
    }).then((response: any) => {
      navigateTo('app/fleet/policies/new-agent-policy/settings');
      cy.getBySel(AGENT_POLICY_FORM.DOWNLOAD_SOURCE_SELECT).contains('Custom Host');
    });
  });
});
