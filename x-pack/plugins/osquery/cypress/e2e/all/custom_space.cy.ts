/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../tags';
import { navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  inputQuery,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { loadSpace, loadPack, cleanupPack, cleanupSpace } from '../../tasks/api_fixtures';
import { ServerlessRoleName } from '../../support/roles';

const testSpaces = [
  { name: 'default', tags: [tag.ESS, tag.SERVERLESS] },
  { name: 'custom-spaces', tags: [tag.ESS] },
];
describe('ALL - Custom space', () => {
  testSpaces.forEach((testSpace) => {
    describe(`[${testSpace.name}]`, { tags: testSpace.tags }, () => {
      let packName: string;
      let packId: string;
      let spaceId: string;

      before(() => {
        cy.wrap(
          new Promise<string>((resolve) => {
            if (testSpace.name !== 'default') {
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
        cy.login(ServerlessRoleName.SOC_MANAGER);
        navigateTo(`/s/${spaceId}/app/osquery`);
      });

      after(() => {
        cleanupPack(packId, spaceId);
        if (testSpace.name !== 'default') {
          cleanupSpace(spaceId);
        }
      });

      it('Discover should be opened in new tab in results table', { tags: [tag.ESS] }, () => {
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
