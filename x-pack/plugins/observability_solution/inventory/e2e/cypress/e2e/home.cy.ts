/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apmSynthtrace, entitiesSynthtrace, logsSynthtrace } from '../../synthtrace';
import { generateEntities, generateLogs, generateTraces } from './generate_data';

const start = '2024-10-16T00:00:00.000Z';
const end = '2024-10-16T00:15:00.000Z';

describe('Home page', () => {
  beforeEach(() => {
    cy.loginAsSuperUser();
  });

  describe('When EEM is disabled', () => {
    it('Shows no data screen', () => {
      cy.visitKibana('/app/inventory');
      cy.contains('See everything you have in one place');
      cy.getByTestSubj('inventoryInventoryPageTemplateFilledButton').should('exist');
    });
  });

  describe('When EEM is enabled', () => {
    describe('When there is no entities', () => {
      it('Shows inventory page with empty message', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('Inventory');
        cy.contains('Tell us what you think!');
        cy.contains('Trying for the first time?');
        cy.contains('No entities available');
        cy.getByTestSubj('addDataButton').should('exist');
        cy.getByTestSubj('associateServiceLogsButton').should('exist');
      });
    });

    describe('When there is entities and signal data', () => {
      before(() => {
        entitiesSynthtrace.index(
          generateEntities({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
        apmSynthtrace.index(
          generateTraces({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
        logsSynthtrace.index(
          generateLogs({ from: new Date(start).getTime(), to: new Date(end).getTime() })
        );
      });
      after(() => {
        entitiesSynthtrace.clean();
        apmSynthtrace.clean();
        logsSynthtrace.clean();
      });

      it('Shows inventory page with entities', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('server1');
        cy.contains('Host');
        cy.contains('synth-node-trace-logs');
        cy.contains('Service');
        cy.contains('foo');
        cy.contains('Container');
      });

      it('Navigates to apm when clicking on a service type entity', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('synth-node-trace-logs').click();
        cy.url().should('include', '/app/apm/services/synth-node-trace-logs/overview');
      });

      it('Navigates to hosts when clicking on a host type entity', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('server1').click();
        cy.url().should('include', '/app/metrics/detail/host/server1');
      });

      it('Navigates to infra when clicking on a container type entity', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.contains('foo').click();
        cy.url().should('include', '/app/metrics/detail/container/foo');
      });

      it('Filters entities by service type', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities*').as('getEntitites');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.getByTestSubj('entityTypesFilterComboBox')
          .click()
          .getByTestSubj('entityTypesFilterserviceOption')
          .click();
        cy.wait('@getEntitites');
        cy.get('server1').should('not.exist');
        cy.contains('synth-node-trace-logs');
        cy.get('foo').should('not.exist');
      });

      it('Filters entities by host type', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities*').as('getEntitites');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.getByTestSubj('entityTypesFilterComboBox')
          .click()
          .getByTestSubj('entityTypesFilterhostOption')
          .click();
        cy.wait('@getEntitites');
        cy.contains('server1');
        cy.get('synth-node-trace-logs').should('not.exist');
        cy.get('foo').should('not.exist');
      });

      it('Filters entities by container type', () => {
        cy.intercept('GET', '/internal/entities/managed/enablement', {
          fixture: 'eem_enabled.json',
        }).as('getEEMStatus');
        cy.intercept('GET', '/internal/inventory/entities*').as('getEntitites');
        cy.visitKibana('/app/inventory');
        cy.wait('@getEEMStatus');
        cy.getByTestSubj('entityTypesFilterComboBox')
          .click()
          .getByTestSubj('entityTypesFiltercontainerOption')
          .click();
        cy.wait('@getEntitites');
        cy.get('server1').should('not.exist');
        cy.get('synth-node-trace-logs').should('not.exist');
        cy.contains('foo');
      });
    });
  });
});
