/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable-next-line import/no-extraneous-dependencies */
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
  AGENT_POLICIES_TAB,
  AGENT_POLICIES_CREATE_AGENT_POLICY_BUTTON,
  AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT_TITLE,
  AGENT_POLICY_CREATE_AGENT_POLICY_NAME_FIELD,
  AGENT_POLICIES_FLYOUT_ADVANCED_DEFAULT_NAMESPACE_HEADER,
  AGENT_POLICY_FLYOUT_CREATE_BUTTON,
  ENROLLMENT_TOKENS_TAB,
  ENROLLMENT_TOKENS_CREATE_TOKEN_BUTTON,
  ENROLLMENT_TOKENS_CREATE_TOKEN_NAME_FIELD,
  DATA_STREAMS_TAB,
  SETTINGS_TAB,
  SETTINGS_FLEET_SERVER_HOST_HEADING,
} from '../../screens/fleet';
import { AGENT_POLICY_NAME_LINK } from '../../screens/integrations';
import { cleanupAgentPolicies, unenrollAgent } from '../../tasks/cleanup';
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
        cy.getBySel('fleetServerHostInput', { timeout: 15000 }).should('be.visible');
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
  describe('Agent Policies', () => {
    before(() => {
      cy.getBySel(AGENT_POLICIES_TAB).click();
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_BUTTON, { timeout: 15000 }).should(
        'be.visible'
      );
    });
    it('Agent Table', () => {
      checkA11y({ skipFailures: false });
    });
    it('Create Policy Flyout', () => {
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_BUTTON).click();
      cy.getBySel(AGENT_POLICIES_CREATE_AGENT_POLICY_FLYOUT_TITLE, { timeout: 15000 }).should(
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
      cy.getBySel(AGENT_POLICY_FLYOUT_CREATE_BUTTON).click();
      cy.getBySel(AGENT_POLICY_NAME_LINK, { timeout: 15000 }).should('be.visible');
      checkA11y({ skipFailures: true });
    });
  });
  describe('Enrollment Tokens', () => {
    before(() => {
      cy.getBySel(ENROLLMENT_TOKENS_TAB).click();
    });
    it('Enrollment Tokens Table', () => {
      cy.getBySel('tableHeaderCell_name_0', { timeout: 15000 }).should('be.visible');
      checkA11y({ skipFailures: false });
    });
    it('Create Enrollment Token Modal', () => {
      cy.getBySel(ENROLLMENT_TOKENS_CREATE_TOKEN_BUTTON).click();
      cy.getBySel(ENROLLMENT_TOKENS_CREATE_TOKEN_NAME_FIELD, { timeout: 15000 }).should(
        'be.visible'
      );
      checkA11y({ skipFailures: false });
    });
  });
  describe('Data Streams', () => {
    before(() => {
      cy.getBySel('confirmModalCancelButton').click();
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
