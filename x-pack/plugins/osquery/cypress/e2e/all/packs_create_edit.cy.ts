/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { API_VERSIONS } from '../../../common/constants';
import { navigateTo } from '../../tasks/navigation';
import {
  deleteAndConfirm,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
} from '../../tasks/live_query';
import { activatePack, deactivatePack, preparePack } from '../../tasks/packs';
import {
  closeModalIfVisible,
  closeToastIfVisible,
  generateRandomStringName,
  interceptPackId,
} from '../../tasks/integrations';
import { DEFAULT_POLICY } from '../../screens/fleet';
import { getIdFormField, getSavedQueriesDropdown } from '../../screens/live_query';
import { loadSavedQuery, cleanupSavedQuery, cleanupPack, loadPack } from '../../tasks/api_fixtures';
import { request } from '../../tasks/common';
import { ServerlessRoleName } from '../../support/roles';

describe('Packs - Create and Edit', () => {
  let savedQueryId: string;
  let savedQueryName: string;
  let nomappingSavedQueryId: string;
  let nomappingSavedQueryName: string;
  let oneMappingSavedQueryId: string;
  let oneMappingSavedQueryName: string;
  let multipleMappingsSavedQueryId: string;
  let multipleMappingsSavedQueryName: string;

  const PACK_NAME = 'Pack-name' + generateRandomStringName(1)[0];

  before(() => {
    loadSavedQuery().then((data) => {
      savedQueryId = data.saved_object_id;
      savedQueryName = data.id;
    });
    loadSavedQuery({
      ecs_mapping: {},
      interval: '3600',
      query: 'select * from uptime;',
    }).then((data) => {
      nomappingSavedQueryId = data.saved_object_id;
      nomappingSavedQueryName = data.id;
    });
    loadSavedQuery({
      ecs_mapping: {
        'client.geo.continent_name': {
          field: 'seconds',
        },
      },
      interval: '3600',
      query: 'select * from uptime;',
    }).then((data) => {
      oneMappingSavedQueryId = data.saved_object_id;
      oneMappingSavedQueryName = data.id;
    });
    loadSavedQuery({
      ecs_mapping: {
        labels: {
          field: 'days',
        },
        tags: {
          field: 'seconds',
        },
        'client.address': {
          field: 'total_seconds',
        },
      },
      interval: '3600',
      query: 'select * from uptime;',
    }).then((data) => {
      multipleMappingsSavedQueryId = data.saved_object_id;
      multipleMappingsSavedQueryName = data.id;
    });
  });

  beforeEach(() => {
    cy.login(ServerlessRoleName.SOC_MANAGER);
    navigateTo('/app/osquery');
  });

  after(() => {
    cleanupSavedQuery(savedQueryId);
    cleanupSavedQuery(nomappingSavedQueryId);
    cleanupSavedQuery(oneMappingSavedQueryId);
    cleanupSavedQuery(multipleMappingsSavedQueryId);
  });

  describe('Check if result type is correct', { tags: ['@ess', '@serverless'] }, () => {
    let resultTypePackId: string;

    before(() => {
      interceptPackId((pack) => {
        resultTypePackId = pack;
      });
    });

    after(() => {
      cleanupPack(resultTypePackId);
    });

    it('Check if result type is correct', () => {
      const packName = 'ResultType' + generateRandomStringName(1)[0];

      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', packName);
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      getIdFormField().type('Query1');
      inputQuery('select * from uptime;');
      cy.wait(500); // wait for the validation to trigger - cypress is way faster than users ;)
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      getIdFormField().type('Query2');
      inputQuery('select * from uptime;');

      cy.getBySel('resultsTypeField').click();
      cy.contains('Differential').click();
      cy.wait(500); // wait for the validation to trigger - cypress is way faster than users ;)

      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      getIdFormField().type('Query3');
      inputQuery('select * from uptime;');
      cy.getBySel('resultsTypeField').click();
      cy.contains('Differential (Ignore removals)').click();
      cy.wait(500); // wait for the validation to trigger - cypress is way faster than users ;)

      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      findAndClickButton('Save pack');
      cy.getBySel('tablePaginationPopoverButton').click();
      cy.getBySel('tablePagination-50-rows').click();
      cy.react('ScheduledQueryNameComponent', {
        props: {
          name: packName,
        },
      }).click();

      findAndClickButton('Edit');
      cy.contains('Query1');
      cy.contains('Query2');
      cy.contains('Query3');
      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: 'Query1' } },
      }).click();
      cy.getBySel('resultsTypeField').contains('Snapshot').click();
      cy.contains('Differential').click();

      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();

      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: 'Query2' } },
      }).click();
      cy.getBySel('resultsTypeField').contains('Differential').click();
      cy.contains('Differential (Ignore removals)').click();

      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: 'Query3' } },
      }).click();
      cy.getBySel('resultsTypeField').contains('(Ignore removals)').click();
      cy.contains('Snapshot').click();

      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        `${DEFAULT_POLICY} {downArrow} {enter}`
      );
      findAndClickButton('Update pack');
      closeModalIfVisible();

      cy.contains(
        'Create packs to organize sets of queries and to schedule queries for agent policies.'
      );
      const queries = {
        Query1: {
          interval: 3600,
          query: 'select * from uptime;',
          removed: true,
          snapshot: false,
        },
        Query2: {
          interval: 3600,
          query: 'select * from uptime;',
          removed: false,
          snapshot: false,
        },
        Query3: {
          interval: 3600,
          query: 'select * from uptime;',
        },
      };
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      }).then((response) => {
        const item = response.body.items.find(
          (policy: PackagePolicy) => policy.name === `Policy for ${DEFAULT_POLICY}`
        );

        expect(item?.inputs[0].config?.osquery.value.packs[packName].queries).to.deep.equal(
          queries
        );
      });
    });
  });

  describe('Check if pack is created', { tags: ['@ess', '@serverless'] }, () => {
    const packName = 'Pack-name' + generateRandomStringName(1)[0];
    let packId: string;

    before(() => {
      interceptPackId((pack) => {
        packId = pack;
      });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('should add a pack from a saved query', () => {
      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', packName);
      findFormFieldByRowsLabelAndType('Description (optional)', 'Pack description');
      findFormFieldByRowsLabelAndType('Scheduled agent policies (optional)', DEFAULT_POLICY);
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      getSavedQueriesDropdown().type(`${savedQueryName}{downArrow}{enter}`);
      cy.react('EuiFormRow', { props: { label: 'Interval (s)' } })
        .click()
        .clear()
        .type('5');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(savedQueryName);
      findAndClickButton('Save pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
      cy.getBySel('tablePaginationPopoverButton').click();
      cy.getBySel('tablePagination-50-rows').click();
      cy.contains(packName);
      cy.contains(`Successfully created "${packName}" pack`);
      closeToastIfVisible();
    });
  });

  describe('to click the edit button and edit pack', { tags: ['@ess', '@serverless'] }, () => {
    const newQueryName = 'new-query-name' + generateRandomStringName(1)[0];

    let packId: string;
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
            },
          })
        )
        .then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('', () => {
      preparePack(packName);
      findAndClickButton('Edit');
      cy.contains(`Edit ${packName}`);
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      inputQuery('select * from uptime');
      findFormFieldByRowsLabelAndType('ID', savedQueryName);
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.contains('ID must be unique').should('exist');
      findFormFieldByRowsLabelAndType('ID', newQueryName);
      cy.contains('ID must be unique').should('not.exist');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(newQueryName);
      findAndClickButton('Update pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
      cy.contains(`Successfully updated "${packName}" pack`);
      closeToastIfVisible();
    });
  });

  describe(
    'should trigger validation when saved query is being chosen',
    { tags: ['@ess', '@serverless'] },
    () => {
      let packId: string;
      let packName: string;

      before(() => {
        request<{ items: PackagePolicy[] }>({
          url: '/internal/osquery/fleet_wrapper/package_policies',
          headers: {
            'Elastic-Api-Version': API_VERSIONS.internal.v1,
          },
        })
          .then((response) =>
            loadPack({
              policy_ids: [response.body.items[0].policy_id],
              queries: {
                [savedQueryName]: {
                  ecs_mapping: {},
                  interval: 3600,
                  query: 'select * from uptime;',
                },
              },
            })
          )
          .then((pack) => {
            packId = pack.saved_object_id;
            packName = pack.name;
          });
      });

      after(() => {
        cleanupPack(packId);
      });

      it('', () => {
        preparePack(packName);
        findAndClickButton('Edit');
        findAndClickButton('Add query');
        cy.contains('Attach next query');
        cy.contains('ID must be unique').should('not.exist');
        getSavedQueriesDropdown().type(`${savedQueryName}{downArrow}{enter}`);
        cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
        cy.contains('ID must be unique').should('exist');
        cy.react('EuiFlyoutFooter').react('EuiButtonEmpty').contains('Cancel').click();
      });
    }
  );

  describe('should open lens in new tab', { tags: ['@ess'] }, () => {
    let packId: string;
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: {
                ecs_mapping: {},
                interval: 3600,
                query: 'select * from uptime;',
              },
            },
          })
        )
        .then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('', () => {
      let lensUrl = '';
      cy.window().then((win) => {
        cy.stub(win, 'open')
          .as('windowOpen')
          .callsFake((url) => {
            lensUrl = url;
          });
      });
      preparePack(packName);
      cy.getBySel('docsLoading').should('exist');
      cy.getBySel('docsLoading').should('not.exist');
      cy.get(`[aria-label="View in Lens"]`).eq(0).click();
      cy.window()
        .its('open')
        .then(() => {
          cy.visit(lensUrl);
        });
      cy.getBySel('lnsWorkspace').should('exist');
      cy.getBySel('breadcrumbs').contains(`Action pack_${packName}_${savedQueryName}`);
    });
  });

  describe.skip('should open discover in new tab', () => {
    let packId: string;
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
            },
          })
        )
        .then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('', () => {
      preparePack(packName);
      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: savedQueryName } },
      })
        .should('exist')
        .within(() => {
          cy.get('a')
            .should('have.attr', 'href')
            .then(($href) => {
              // @ts-expect-error-next-line href string - check types
              cy.visit($href);
              cy.getBySel('breadcrumbs').contains('Discover').should('exist');
              cy.contains(`action_id: pack_${PACK_NAME}_${savedQueryName}`);
              cy.getBySel('superDatePickerToggleQuickMenuButton').click();
              cy.getBySel('superDatePickerCommonlyUsed_Today').click();
              cy.getBySel('discoverDocTable', { timeout: 60000 }).contains(
                `pack_${PACK_NAME}_${savedQueryName}`
              );
            });
        });
    });
  });

  describe('deactivate and activate pack', { tags: ['@ess', '@serverless'] }, () => {
    let packId: string;
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
            },
          })
        )
        .then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('', () => {
      cy.contains('Packs').click();
      deactivatePack(packName);
      activatePack(packName);
    });
  });

  describe('should verify that packs are triggered', { tags: ['@ess', '@serverless'] }, () => {
    let packId: string;
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' },
            },
          })
        )
        .then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('', () => {
      preparePack(packName);
      cy.contains(`${packName} details`).should('exist');

      recurse<string>(
        () => {
          cy.waitForReact();

          cy.getBySel('docsLoading').should('exist');
          cy.getBySel('docsLoading').should('not.exist');

          return cy.get('tbody .euiTableRow > td:nth-child(5)').invoke('text');
        },
        (response) => response === 'Docs1',
        {
          timeout: 300000,
          post: () => {
            cy.reload();
          },
        }
      );

      cy.react('ScheduledQueryLastResults', { options: { timeout: 3000 } })
        .should('exist')
        .within(() => {
          cy.react('FormattedRelative');
        });

      cy.react('DocsColumnResults').within(() => {
        cy.react('EuiNotificationBadge').contains('1');
      });
      cy.react('AgentsColumnResults').within(() => {
        cy.react('EuiNotificationBadge').contains('1');
      });
      cy.getBySel('packResultsErrorsEmpty').should('have.length', 1);
    });
  });

  describe('delete all queries in the pack', { tags: ['@ess', '@serverless'] }, () => {
    let packId: string;
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
            },
          })
        )
        .then((pack) => {
          packId = pack.saved_object_id;
          packName = pack.name;
        });
    });

    after(() => {
      cleanupPack(packId);
    });

    it('', () => {
      preparePack(packName);
      cy.contains(/^Edit$/).click();

      cy.getBySel('checkboxSelectAll').click();

      cy.contains(/^Delete \d+ quer(y|ies)/).click();
      cy.contains(/^Update pack$/).click();
      cy.react('EuiButtonDisplay')
        .contains(/^Save and deploy changes$/)
        .click();
      cy.get('a').contains(packName).click();
      cy.contains(`${packName} details`).should('exist');
      cy.contains(/^No items found/).should('exist');
    });
  });

  describe(
    'enable changing saved queries and ecs_mappings',
    { tags: ['@ess', '@serverless'] },
    () => {
      let packId: string;
      let packName: string;

      before(() => {
        request<{ items: PackagePolicy[] }>({
          url: '/internal/osquery/fleet_wrapper/package_policies',
          headers: {
            'Elastic-Api-Version': API_VERSIONS.internal.v1,
          },
        })
          .then((response) =>
            loadPack({
              policy_ids: [response.body.items[0].policy_id],
              queries: {
                [savedQueryName]: {
                  ecs_mapping: {},
                  interval: 3600,
                  query: 'select * from uptime;',
                },
              },
            })
          )
          .then((pack) => {
            packId = pack.saved_object_id;
            packName = pack.name;
          });
      });

      after(() => {
        cleanupPack(packId);
      });

      it('', () => {
        preparePack(packName);
        cy.contains(/^Edit$/).click();

        findAndClickButton('Add query');

        getSavedQueriesDropdown().type(`${multipleMappingsSavedQueryName} {downArrow} {enter}`);
        cy.contains('Custom key/value pairs').should('exist');
        cy.contains('Days of uptime').should('exist');
        cy.contains('List of keywords used to tag each').should('exist');
        cy.contains('Seconds of uptime').should('exist');
        cy.contains('Client network address.').should('exist');
        cy.contains('Total uptime seconds').should('exist');
        cy.getBySel('ECSMappingEditorForm').should('have.length', 4);

        getSavedQueriesDropdown().type(`${nomappingSavedQueryName} {downArrow} {enter}`);
        cy.contains('Custom key/value pairs').should('not.exist');
        cy.contains('Days of uptime').should('not.exist');
        cy.contains('List of keywords used to tag each').should('not.exist');
        cy.contains('Seconds of uptime').should('not.exist');
        cy.contains('Client network address.').should('not.exist');
        cy.contains('Total uptime seconds').should('not.exist');
        cy.getBySel('ECSMappingEditorForm').should('have.length', 1);

        getSavedQueriesDropdown().type(`${oneMappingSavedQueryName} {downArrow} {enter}`);
        cy.contains('Name of the continent').should('exist');
        cy.contains('Seconds of uptime').should('exist');
        cy.getBySel('ECSMappingEditorForm').should('have.length', 2);

        findAndClickButton('Save');
        cy.react('CustomItemAction', {
          props: { index: 0, item: { id: oneMappingSavedQueryName } },
        }).click();
        cy.contains('Name of the continent').should('exist');
        cy.contains('Seconds of uptime').should('exist');
      });
    }
  );

  describe('to click delete button', { tags: ['@ess', '@serverless'] }, () => {
    let packName: string;

    before(() => {
      request<{ items: PackagePolicy[] }>({
        url: '/internal/osquery/fleet_wrapper/package_policies',
        headers: {
          'Elastic-Api-Version': API_VERSIONS.internal.v1,
        },
      })
        .then((response) =>
          loadPack({
            policy_ids: [response.body.items[0].policy_id],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
            },
          })
        )
        .then((pack) => {
          packName = pack.name;
        });
    });

    it('', { tags: ['@ess', '@serverless'] }, () => {
      preparePack(packName);
      findAndClickButton('Edit');
      deleteAndConfirm('pack');
    });
  });
});
