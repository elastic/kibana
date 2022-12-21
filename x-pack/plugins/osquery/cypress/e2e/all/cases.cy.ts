/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { checkResults } from '../../tasks/live_query';
import { navigateTo } from '../../tasks/navigation';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { login } from '../../tasks/login';
import { ROLES } from '../../test';

describe('Add to Cases', () => {
  describe('observability', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'case_observability');
      login(ROLES.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'case_observability');
    });
    it('should add result a case and not have add to timeline in result', () => {
      cy.waitForReact();
      cy.react('CustomItemAction', {
        props: { index: 1 },
      }).click();
      cy.contains('Live query details');
      cy.contains('Add to Case').click();
      cy.contains('Select case');
      cy.contains(/Select$/).click();
      cy.contains('Test Obs case has been updated');
      cy.visit('/app/observability/cases');
      cy.contains('Test Obs case').click();
      checkResults();
      cy.contains('attached Osquery results');
      cy.contains('select * from uptime;');
      cy.contains('View in Discover').should('exist');
      cy.contains('View in Lens').should('exist');
      cy.contains('Add to Case').should('not.exist');
      cy.contains('Add to timeline investigation').should('not.exist');
    });
  });
  describe('security', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'case_security');
      login(ROLES.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'case_security');
    });

    it('should add result a case and have add to timeline in result', () => {
      cy.waitForReact();
      cy.react('CustomItemAction', {
        props: { index: 1 },
      }).click();
      cy.contains('Live query details');
      cy.contains('Add to Case').click();
      cy.contains('Select case');
      cy.contains(/Select$/).click();
      cy.contains('Test Security Case has been updated');
      cy.visit('/app/security/cases');
      cy.contains('Test Security Case').click();
      checkResults();
      cy.contains('attached Osquery results');
      cy.contains('select * from uptime;');
      cy.contains('View in Discover').should('exist');
      cy.contains('View in Lens').should('exist');
      cy.contains('Add to Case').should('not.exist');
      cy.contains('Add to timeline investigation').should('exist');
    });
  });
});
