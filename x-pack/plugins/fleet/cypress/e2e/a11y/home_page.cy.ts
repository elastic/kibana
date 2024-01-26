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
  AGENT_FLYOUT,
  GENERATE_FLEET_SERVER_POLICY_BUTTON,
  PLATFORM_TYPE_LINUX_BUTTON,
  ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON,
  ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON,
  AGENT_POLICIES_TAB,
  AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT,
  AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD,
  AGENT_POLICIES_FLYOUT_ADVANCED_DEFAULT_NAMESPACE_HEADER,
  AGENT_POLICY_FLYOUT_CREATE_BUTTON,
  ENROLLMENT_TOKENS_TAB,
  ENROLLMENT_TOKENS,
  DATA_STREAMS_TAB,
  SETTINGS_TAB,
  SETTINGS_FLEET_SERVER_HOST_HEADING,
  FLEET_SERVER_SETUP,
  LANDING_PAGE_ADD_FLEET_SERVER_BUTTON,
  UNINSTALL_TOKENS_TAB,
  UNINSTALL_TOKENS,
} from '../../screens/fleet';
import { AGENT_POLICY_NAME_LINK } from '../../screens/integrations';
import { cleanupAgentPolicies, unenrollAgent } from '../../tasks/cleanup';
import { setFleetServerHost } from '../../tasks/fleet_server';

import { API_VERSIONS } from '../../../common/constants';
import { login } from '../../tasks/login';
import { request } from '../../tasks/common';

describe('Home page', () => {
  before(() => {
    setFleetServerHost('https://fleetserver:8220');
  });

  beforeEach(() => {
    login();
  });

  describe('Agents', () => {
    beforeEach(() => {
      navigateTo(FLEET);
      cy.getBySel(LANDING_PAGE_ADD_FLEET_SERVER_BUTTON).click();
      cy.getBySel(AGENT_FLYOUT.QUICK_START_TAB_BUTTON, { timeout: 15000 }).should('be.visible');
    });

    const fleetServerHost = 'https://localhost:8220';

    describe('Quick Start', () => {
      it('Get started with fleet', () => {
        checkA11y({ skipFailures: false });
      });
      it('Install Fleet Server', () => {
        cy.getBySel(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
        cy.getBySel(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
        cy.getBySel(FLEET_SERVER_SETUP.NAME_INPUT).type('Host edited');
        cy.get('[placeholder="Specify host URL"', { timeout: 15000 }).should('be.visible');
        cy.get('[placeholder="Specify host URL"').type(fleetServerHost);
        cy.getBySel(GENERATE_FLEET_SERVER_POLICY_BUTTON).click();
        cy.getBySel(PLATFORM_TYPE_LINUX_BUTTON, { timeout: 15000 })
          .scrollIntoView()
          .should('be.visible');
        checkA11y({ skipFailures: false });
      });
    });

    describe('Advanced', () => {
      beforeEach(() => {
        navigateTo(FLEET);
        cy.getBySel(LANDING_PAGE_ADD_FLEET_SERVER_BUTTON).click();
        cy.getBySel(AGENT_FLYOUT.QUICK_START_TAB_BUTTON, { timeout: 15000 }).should('be.visible');
        cy.getBySel(AGENT_FLYOUT.ADVANCED_TAB_BUTTON).click();
      });
      it('Select policy for fleet', () => {
        checkA11y({ skipFailures: false });
      });
      it('Add your fleet sever host', () => {
        cy.getBySel(FLEET_SERVER_SETUP.SELECT_HOSTS).click();
        cy.getBySel(FLEET_SERVER_SETUP.ADD_HOST_BTN).click();
        cy.getBySel(FLEET_SERVER_SETUP.NAME_INPUT).type('New host');
        cy.get('[placeholder="Specify host URL"').type('https://localhost:8220');
        cy.getBySel(ADVANCED_FLEET_SERVER_ADD_HOST_BUTTON).click();
        checkA11y({ skipFailures: false });
      });
      it('Generate service token', () => {
        cy.getBySel(ADVANCED_FLEET_SERVER_GENERATE_SERVICE_TOKEN_BUTTON).click();
        cy.getBySel(PLATFORM_TYPE_LINUX_BUTTON, { timeout: 15000 })
          .scrollIntoView()
          .should('be.visible');
        checkA11y({ skipFailures: false });
      });
    });
  });

  describe('Agent Policies', () => {
    beforeEach(() => {
      navigateTo(FLEET);
      cy.getBySel(AGENT_POLICIES_TAB).click();
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON, {
        timeout: 15000,
      }).should('be.visible');
    });
    it('Agent Table', () => {
      checkA11y({ skipFailures: false });
    });
    it('Create Policy Flyout', () => {
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).click();
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE, { timeout: 15000 }).should(
        'be.visible'
      );
      cy.getBySel(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).type('testName');
      cy.get('.ingest-active-button').click();
      cy.getBySel(AGENT_POLICIES_FLYOUT_ADVANCED_DEFAULT_NAMESPACE_HEADER, {
        timeout: 15000,
      }).should('be.visible');
      checkA11y({ skipFailures: false });
    });
    it('Agent Table After Adding Another Agent', () => {
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.CREATE_BUTTON).click();
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT.TITLE, { timeout: 15000 }).should(
        'be.visible'
      );
      cy.getBySel(AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD).type('testName');
      cy.getBySel(AGENT_POLICY_FLYOUT_CREATE_BUTTON).click();
      cy.getBySel(AGENT_POLICY_NAME_LINK, { timeout: 15000 }).should('be.visible');
      checkA11y({ skipFailures: true });
    });
  });

  describe('Enrollment Tokens', () => {
    beforeEach(() => {
      navigateTo(FLEET);
      cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
    });
    it('Enrollment Tokens Table', () => {
      cy.getBySel('tableHeaderCell_name_0', { timeout: 15000 }).should('be.visible');
      checkA11y({ skipFailures: false });
    });
    it('Create Enrollment Token Modal', () => {
      cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_BUTTON).click();
      cy.getBySel(ENROLLMENT_TOKENS.CREATE_TOKEN_MODAL_NAME_FIELD, { timeout: 15000 }).should(
        'be.visible'
      );
      checkA11y({ skipFailures: false });
    });
  });

  describe('Uninstall Tokens', () => {
    before(() => {
      request({
        method: 'POST',
        url: '/api/fleet/agent_policies',
        body: { name: 'Agent policy for A11y test', namespace: 'default', id: 'agent-policy-a11y' },
        headers: { 'kbn-xsrf': 'cypress', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
      });
    });
    beforeEach(() => {
      navigateTo(FLEET);
      cy.getBySel(UNINSTALL_TOKENS_TAB).click();
    });
    after(() => {
      request({
        method: 'POST',
        url: '/api/fleet/agent_policies/delete',
        body: { agentPolicyId: 'agent-policy-a11y' },
        headers: { 'kbn-xsrf': 'kibana', 'Elastic-Api-Version': `${API_VERSIONS.public.v1}` },
      });
    });
    it('Uninstall Tokens Table', () => {
      cy.getBySel(UNINSTALL_TOKENS.POLICY_ID_TABLE_FIELD).first().should('be.visible');
      checkA11y({ skipFailures: false });
    });
    it('Uninstall Command Flyout', () => {
      cy.getBySel(UNINSTALL_TOKENS.VIEW_UNINSTALL_COMMAND_BUTTON).first().click();
      cy.getBySel(UNINSTALL_TOKENS.UNINSTALL_COMMAND_FLYOUT).should('be.visible');
      checkA11y({ skipFailures: false });
    });
  });

  describe('Data Streams', () => {
    before(() => {
      login();
      navigateTo(FLEET);
      cy.getBySel(DATA_STREAMS_TAB, { timeout: 15000 }).should('be.visible');
      cy.getBySel(DATA_STREAMS_TAB).click();
    });
    it('Datastreams Empty Table', () => {
      cy.getBySel('tableHeaderSortButton', { timeout: 15000 }).should('be.visible');
      checkA11y({ skipFailures: false });
    });
  });
  describe.skip('Settings', () => {
    // A11y Violation https://github.com/elastic/kibana/issues/138474
    before(() => {
      cy.getBySel(SETTINGS_TAB).click();
    });
    it('Settings Form', () => {
      cy.getBySel(SETTINGS_FLEET_SERVER_HOST_HEADING, { timeout: 15000 }).should('be.visible');
      checkA11y({ skipFailures: false });
    });
  });
  after(() => {
    unenrollAgent();
    cleanupAgentPolicies();
  });
});
