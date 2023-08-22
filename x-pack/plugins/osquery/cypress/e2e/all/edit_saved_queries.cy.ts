/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import { loadSavedQuery, cleanupSavedQuery } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../../../../test_serverless/shared/lib';

describe('ALL - Edit saved query', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  let savedQueryName: string;
  let savedQueryId: string;

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery/saved_queries');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
  });

  it('by changing ecs mappings and platforms', () => {
    cy.react('CustomItemAction', {
      props: { index: 1, item: { id: savedQueryName } },
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
      props: { index: 1, item: { id: savedQueryName } },
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
