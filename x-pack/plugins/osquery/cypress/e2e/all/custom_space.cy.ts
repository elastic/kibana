/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLE, login } from '../../tasks/login';
import { navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { loadSpace, loadPack, cleanupPack, cleanupSpace } from '../../tasks/api_fixtures';

describe('ALL - Custom space', () => {
  ['default', 'custom-space'].forEach((spaceName) => {
    describe(`[${spaceName}]`, () => {
      let packName: string;
      let packId: string;
      let spaceId: string;

      before(() => {
        cy.wrap(
          new Promise<string>((resolve) => {
            if (spaceName !== 'default') {
              loadSpace().then((space) => {
                spaceId = space.id;
                resolve(spaceId);
              });
            } else {
              spaceId = 'default';
              resolve(spaceId);
            }
          })
        ).then((space) => {
          loadPack(
            {
              queries: {
                test: {
                  interval: 10,
                  query: 'select * from uptime;',
                  ecs_mapping: {},
                },
              },
            },
            space as string
          ).then((data) => {
            packId = data.saved_object_id;
            packName = data.name;
          });
        });
      });

      beforeEach(() => {
        login(ROLE.soc_manager);
        navigateTo(`/s/${spaceId}/app/osquery`);
      });

      after(() => {
        cleanupPack(packId, spaceId);
        if (spaceName !== 'default') {
          cleanupSpace(spaceId);
        }
      });

      it('Discover should be opened in new tab in results table', () => {
        cy.contains('New live query').click();
        selectAllAgents();
        inputQuery('select * from uptime;');
        submitQuery();
        checkResults();
        checkActionItemsInResults({
          lens: true,
          discover: true,
          cases: true,
          timeline: false,
        });
        cy.contains('View in Discover')
          .should('exist')
          .should('have.attr', 'href')
          .then(($href) => {
            // @ts-expect-error-next-line href string - check types
            cy.visit($href);
            cy.getBySel('breadcrumbs').contains('Discover').should('exist');
            cy.getBySel('discoverDocTable', { timeout: 60000 }).within(() => {
              cy.contains('action_data.queryselect * from uptime');
            });
          });
      });

      it('runs packs normally', () => {
        cy.contains('Packs').click();
        cy.contains('Create pack').click();
        cy.react('CustomItemAction', {
          props: { item: { name: packName } },
        }).click();
        selectAllAgents();
        cy.contains('Submit').click();
        checkResults();
      });
    });
  });
});
