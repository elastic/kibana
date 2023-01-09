/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { navigateTo } from '../../tasks/navigation';
import { login } from '../../tasks/login';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { ROLES } from '../../test';

describe('ALL - Edit saved query', () => {
  const SAVED_QUERY_ID = 'Saved-Query-Id';

  before(() => {
    runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
  });
  beforeEach(() => {
    login(ROLES.soc_manager);
    navigateTo('/app/osquery/saved_queries');
  });

  after(() => {
    runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
  });

  it('by changing ecs mappings and platforms', () => {
    cy.getBySel('pagination-button-next').click();
    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.contains('Custom key/value pairs.').should('exist');
    cy.contains('Hours of uptime').should('exist');
    cy.get('[data-test-subj="ECSMappingEditorForm"]')
      .first()
      .within(() => {
        cy.react('EuiButtonIcon', { props: { iconType: 'trash' } }).click();
      });

    cy.react('PlatformCheckBoxGroupField')
      .first()
      .within(() => {
        cy.react('EuiCheckbox', {
          props: {
            id: 'linux',
            checked: true,
          },
        }).should('exist');
        cy.react('EuiCheckbox', {
          props: {
            id: 'darwin',
            checked: true,
          },
        }).should('exist');

        cy.react('EuiCheckbox', {
          props: {
            id: 'windows',
            checked: false,
          },
        }).should('exist');
      });

    cy.get('#windows').check({ force: true });

    cy.react('EuiButton').contains('Update query').click();

    cy.wait(5000);

    cy.react('CustomItemAction', {
      props: { index: 1, item: { attributes: { id: SAVED_QUERY_ID } } },
    }).click();
    cy.contains('Custom key/value pairs').should('not.exist');
    cy.contains('Hours of uptime').should('not.exist');

    cy.react('PlatformCheckBoxGroupField')
      .first()
      .within(() => {
        cy.react('EuiCheckbox', {
          props: {
            id: 'linux',
            checked: true,
          },
        }).should('exist');
        cy.react('EuiCheckbox', {
          props: {
            id: 'darwin',
            checked: true,
          },
        }).should('exist');

        cy.react('EuiCheckbox', {
          props: {
            id: 'windows',
            checked: true,
          },
        }).should('exist');
      });
  });
});
