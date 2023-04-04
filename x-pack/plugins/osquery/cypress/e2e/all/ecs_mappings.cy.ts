/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAdvancedButton } from '../../screens/integrations';
import { login } from '../../tasks/login';
import { ROLES } from '../../test';
import { navigateTo } from '../../tasks/navigation';
import {
  checkResults,
  getOsqueryFieldTypes,
  inputQuery,
  selectAllAgents,
  submitQuery,
  typeInECSFieldInput,
  typeInOsqueryFieldInput,
} from '../../tasks/live_query';

describe('EcsMapping', () => {
  beforeEach(() => {
    login(ROLES.soc_manager);
  });

  it('should properly show static values in form and results', () => {
    navigateTo('/app/osquery');
    cy.contains('New live query').click();
    selectAllAgents();
    inputQuery('select * from processes;');
    getAdvancedButton().click();
    typeInECSFieldInput('tags{downArrow}{enter}');
    getOsqueryFieldTypes('Static value');
    typeInOsqueryFieldInput('test1{enter}test2{enter}');
    submitQuery();
    checkResults();
    cy.contains('[ "test1", "test2" ]');
    typeInECSFieldInput('labels{downArrow}{enter}', 1);

    getOsqueryFieldTypes('Static value', 1);

    typeInOsqueryFieldInput('test3{enter}', 1);
    submitQuery();
    checkResults();
    cy.contains('[ "test1", "test2" ]');
    cy.contains('test3');
    cy.get(`[title="Remove test1 from selection in this group"]`).click();
    submitQuery();
    checkResults();
    cy.contains('[ "test2" ]');
    cy.contains('test3');
  });

  it('should hide and show ecs mappings on Advanced accordion click', () => {
    navigateTo('/app/osquery');
    cy.contains('New live query').click();
    selectAllAgents();
    cy.getBySel('savedQuerySelect').within(() => {
      cy.getBySel('comboBoxInput').type('processes_elastic{downArrow}{enter}');
    });
    cy.react('EuiAccordionClass', {
      props: { buttonContent: 'Advanced', forceState: 'open' },
    }).should('exist');
    cy.getBySel('advanced-accordion-content').within(() => {
      cy.contains('Advanced').click();
    });
    cy.react('EuiAccordionClass', {
      props: { buttonContent: 'Advanced', forceState: 'closed' },
    }).should('exist');
  });
});
