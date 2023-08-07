/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import { find } from 'lodash';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { tag } from '../../tags';
import { API_VERSIONS } from '../../../common/constants';
import { FLEET_AGENT_POLICIES, navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  deleteAndConfirm,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
  isServerless,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { ROLE } from '../../tasks/login';
import {
  activatePack,
  cleanupAllPrebuiltPacks,
  deactivatePack,
  preparePack,
} from '../../tasks/packs';
import {
  addIntegration,
  closeModalIfVisible,
  closeToastIfVisible,
  generateRandomStringName,
  interceptPackId,
  interceptAgentPolicyId,
} from '../../tasks/integrations';
import { DEFAULT_POLICY, OSQUERY_POLICY } from '../../screens/fleet';
import {
  getIdFormField,
  getSavedQueriesDropdown,
  LIVE_QUERY_EDITOR,
} from '../../screens/live_query';
import {
  loadSavedQuery,
  cleanupSavedQuery,
  cleanupPack,
  loadPack,
  cleanupAgentPolicy,
} from '../../tasks/api_fixtures';
import { request } from '../../tasks/common';

describe('ALL - Packs', () => {
  let savedQueryId: string;
  let savedQueryName: string;
  let nomappingSavedQueryId: string;
  let nomappingSavedQueryName: string;
  let oneMappingSavedQueryId: string;
  let oneMappingSavedQueryName: string;
  let multipleMappingsSavedQueryId: string;
  let multipleMappingsSavedQueryName: string;

  const integration = 'Osquery Manager';
  const PACK_NAME = 'Pack-name' + generateRandomStringName(1)[0];

  describe('Create and edit a pack', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
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
      cy.loginKibana(ROLE.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      cleanupSavedQuery(savedQueryId);
      cleanupSavedQuery(nomappingSavedQueryId);
      cleanupSavedQuery(oneMappingSavedQueryId);
      cleanupSavedQuery(multipleMappingsSavedQueryId);
    });

    describe('Check if result type is correct', () => {
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
          'fleet server {downArrow} {enter}'
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
            (policy: PackagePolicy) => policy.policy_id === 'fleet-server-policy'
          );

          expect(item?.inputs[0].config?.osquery.value.packs[packName].queries).to.deep.equal(
            queries
          );
        });
      });
    });

    describe('Check if pack is created', () => {
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

    describe('to click the edit button and edit pack', () => {
      const newQueryName = 'new-query-name' + generateRandomStringName(1)[0];

      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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

    describe('should trigger validation when saved query is being chosen', () => {
      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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
    });

    if (!isServerless) {
      describe('should open lens in new tab', { tags: [tag.ESS] }, () => {
        let packId: string;
        let packName: string;

        before(() => {
          loadPack({
            policy_ids: ['fleet-server-policy'],
            queries: {
              [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
            },
          }).then((pack) => {
            packId = pack.saved_object_id;
            packName = pack.name;
          });
        });

        after(() => {
          cleanupPack(packId);
        });

        it('', { tags: [tag.ESS] }, () => {
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
    }

    describe.skip('should open discover in new tab', () => {
      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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

    describe('deactivate and activate pack', () => {
      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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

    describe('should verify that packs are triggered', () => {
      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 60, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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

    describe('delete all queries in the pack', () => {
      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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

    describe('enable changing saved queries and ecs_mappings', () => {
      let packId: string;
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
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
    });

    describe('to click delete button', () => {
      let packName: string;

      before(() => {
        loadPack({
          policy_ids: ['fleet-server-policy'],
          queries: {
            [savedQueryName]: { ecs_mapping: {}, interval: 3600, query: 'select * from uptime;' },
          },
        }).then((pack) => {
          packName = pack.name;
        });
      });

      it('', () => {
        preparePack(packName);
        findAndClickButton('Edit');
        deleteAndConfirm('pack');
      });
    });
  });

  describe(
    'Validate that agent policy is getting removed from pack if we remove agent policy',
    { tags: [tag.ESS] },
    () => {
      beforeEach(() => {
        cy.loginKibana();
      });
      const AGENT_POLICY_NAME = `PackTest` + generateRandomStringName(1)[0];
      const REMOVING_PACK = 'removing-pack' + generateRandomStringName(1)[0];

      it('add integration', () => {
        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains('Create agent policy').click();
        cy.get('input[placeholder*="Choose a name"]').type(AGENT_POLICY_NAME);
        cy.get('.euiFlyoutFooter').contains('Create agent policy').click();
        cy.contains(`Agent policy '${AGENT_POLICY_NAME}' created`);
        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains(AGENT_POLICY_NAME).click();
        cy.contains('Add integration').click();
        cy.contains(integration).click();
        addIntegration(AGENT_POLICY_NAME);
        cy.contains('Add Elastic Agent later').click();
        navigateTo('app/osquery/packs');
        findAndClickButton('Add pack');
        findFormFieldByRowsLabelAndType('Name', REMOVING_PACK);
        findFormFieldByRowsLabelAndType('Scheduled agent policies (optional)', AGENT_POLICY_NAME);
        findAndClickButton('Save pack');

        closeToastIfVisible();
        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.react('ScheduledQueryNameComponent', { props: { name: REMOVING_PACK } }).click();
        cy.contains(`${REMOVING_PACK} details`).should('exist');
        findAndClickButton('Edit');
        cy.react('EuiComboBoxInput', { props: { value: AGENT_POLICY_NAME } }).should('exist');

        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains(AGENT_POLICY_NAME).click();
        cy.get('.euiTableCellContent')
          .get('.euiPopover__anchor')
          .get(`[aria-label="Open"]`)
          .first()
          .click();
        cy.contains(/^Delete integration$/).click();
        closeModalIfVisible();
        cy.contains(/^Deleted integration 'osquery_manager-*/);
        navigateTo('app/osquery/packs');
        cy.contains(REMOVING_PACK).click();
        cy.contains(`${REMOVING_PACK} details`).should('exist');
        cy.wait(1000);
        findAndClickButton('Edit');
        cy.react('EuiComboBoxInput', { props: { value: '' } }).should('exist');
      });
    }
  );

  describe('Load prebuilt packs', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
    beforeEach(() => {
      cy.loginKibana(ROLE.soc_manager);
      navigateTo('/app/osquery/packs');
    });

    after(() => {
      cleanupAllPrebuiltPacks();
    });

    const PREBUILD_PACK_NAME = 'it-compliance';

    it('should load prebuilt packs', () => {
      cy.contains('Load Elastic prebuilt packs').click();
      cy.contains('Load Elastic prebuilt packs').should('not.exist');
      cy.wait(1000);
      cy.react('EuiTableRow').should('have.length.above', 5);
    });

    it('should be able to activate pack', () => {
      activatePack(PREBUILD_PACK_NAME);
      deactivatePack(PREBUILD_PACK_NAME);
    });

    it('should be able to add policy to it', () => {
      cy.contains(PREBUILD_PACK_NAME).click();
      cy.contains('Edit').click();
      findFormFieldByRowsLabelAndType(
        'Scheduled agent policies (optional)',
        'fleet server {downArrow}{enter}'
      );
      cy.contains('Update pack').click();
      cy.getBySel('confirmModalConfirmButton').click();
      cy.contains(`Successfully updated "${PREBUILD_PACK_NAME}" pack`);
    });

    it('should be able to activate pack with agent inside', () => {
      activatePack(PREBUILD_PACK_NAME);
      deactivatePack(PREBUILD_PACK_NAME);
    });
    it('should not be able to update prebuilt pack', () => {
      cy.contains(PREBUILD_PACK_NAME).click();
      cy.contains('Edit').click();
      cy.react('EuiFieldText', { props: { name: 'name', isDisabled: true } });
      cy.react('EuiFieldText', { props: { name: 'description', isDisabled: true } });
      cy.contains('Add Query').should('not.exist');
      cy.react('ExpandedItemActions', { options: { timeout: 1000 } });
      cy.get('.euiTableRowCell--hasActions').should('not.exist');
    });
    it('should be able to delete prebuilt pack and add it again', () => {
      cy.contains(PREBUILD_PACK_NAME).click();
      cy.contains('Edit').click();
      deleteAndConfirm('pack');
      cy.contains(PREBUILD_PACK_NAME).should('not.exist');
      cy.contains('Update Elastic prebuilt packs').click();
      cy.contains('Successfully updated prebuilt packs');
      cy.contains(PREBUILD_PACK_NAME).should('exist');
    });

    it('should be able to run live prebuilt pack', () => {
      navigateTo('/app/osquery/live_queries');
      cy.contains('New live query').click();
      cy.contains('Run a set of queries in a pack.').click();
      cy.get(LIVE_QUERY_EDITOR).should('not.exist');
      cy.getBySel('select-live-pack').click().type('osquery-monitoring{downArrow}{enter}');
      selectAllAgents();
      submitQuery();
      cy.getBySel('live-query-loading').should('exist');
      cy.getBySel('live-query-loading', { timeout: 10000 }).should('not.exist');
      cy.getBySel('toggleIcon-events').click();
      checkResults();
      checkActionItemsInResults({
        lens: true,
        discover: true,
        cases: true,
        timeline: false,
      });
      navigateTo('/app/osquery');
      cy.contains('osquery-monitoring');
    });
  });

  describe('Global packs', { tags: [tag.ESS] }, () => {
    beforeEach(() => {
      cy.loginKibana();
      navigateTo('/app/osquery/packs');
    });

    describe('add proper shard to policies packs config', () => {
      const globalPack = 'globalPack' + generateRandomStringName(1)[0];
      const agentPolicy = 'testGlobal' + generateRandomStringName(1)[0];
      let globalPackId: string;
      let agentPolicyId: string;

      before(() => {
        interceptPackId((pack) => {
          globalPackId = pack;
        });
        interceptAgentPolicyId((policyId) => {
          agentPolicyId = policyId;
        });
      });

      after(() => {
        cleanupPack(globalPackId);
        cleanupAgentPolicy(agentPolicyId);
      });

      it('add global packs to policies', () => {
        findAndClickButton('Add pack');
        findFormFieldByRowsLabelAndType('Name', globalPack);
        cy.getBySel('policyIdsComboBox').should('exist');
        cy.getBySel('osqueryPackTypeGlobal').click();
        cy.getBySel('policyIdsComboBox').should('not.exist');

        findAndClickButton('Save pack');

        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains(globalPack);
        cy.contains(`Successfully created "${globalPack}" pack`);
        closeToastIfVisible();

        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains('Create agent policy').click();
        cy.getBySel('createAgentPolicyNameField').type(agentPolicy);
        cy.getBySel('createAgentPolicyFlyoutBtn').click();
        cy.contains(`Agent policy '${agentPolicy}' created`).click();
        cy.contains(agentPolicy).click();
        cy.contains('Add integration').click();
        cy.contains(integration).click();
        addIntegration(agentPolicy);
        cy.contains('Add Elastic Agent later').click();
        cy.contains('osquery_manager-');
        request<{ items: PackagePolicy[] }>({
          url: '/internal/osquery/fleet_wrapper/package_policies',
          headers: {
            'Elastic-Api-Version': API_VERSIONS.internal.v1,
          },
        }).then((response) => {
          const item = find(response.body.items, ['policy_id', agentPolicyId]);

          expect(item?.inputs[0].config?.osquery.value.packs[globalPack]).to.deep.equal({
            shard: 100,
            queries: {},
          });
        });
        cy.visit('/app/fleet/policies');
        cy.contains('td', agentPolicy)
          .parent()
          .within(() => {
            cy.contains('rev. 2').click();
          });
      });
    });

    describe('add proper shard to policies packs config', () => {
      let shardPackId: string;

      before(() => {
        interceptPackId((pack) => {
          shardPackId = pack;
        });
      });

      after(() => {
        cleanupPack(shardPackId);
      });

      it('', () => {
        const shardPack = 'shardPack' + generateRandomStringName(1)[0];

        findAndClickButton('Add pack');
        findFormFieldByRowsLabelAndType('Name', shardPack);

        cy.contains('Partial deployment (shards)').click();
        cy.getBySel('packShardsForm-0').within(() => {
          cy.getBySel('shards-field-policy').type(`${DEFAULT_POLICY}{downArrow}{enter}`);
          cy.get('#shardsPercentage0').type('{backspace}{backspace}5');
        });
        cy.getBySel('packShardsForm-1').within(() => {
          cy.getBySel('shards-field-policy').type(`${OSQUERY_POLICY}{downArrow}{enter}`);
          cy.get('#shardsPercentage1').type('{backspace}{backspace}{backspace}');
        });
        findAndClickButton('Save pack');

        cy.contains(`Successfully created "${shardPack}" pack`);
        closeToastIfVisible();

        request<{ items: PackagePolicy[] }>({
          url: '/internal/osquery/fleet_wrapper/package_policies',
          headers: {
            'Elastic-Api-Version': API_VERSIONS.internal.v1,
          },
        }).then((response) => {
          const shardPolicy = response.body.items.find(
            (policy: PackagePolicy) => policy.policy_id === 'fleet-server-policy'
          );

          expect(shardPolicy?.inputs[0].config?.osquery.value.packs[shardPack]).to.deep.equal({
            shard: 15,
            queries: {},
          });
        });
        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains(shardPack).click();
        cy.contains('Edit').click();
        cy.get('#shardsPercentage0').should('have.value', '15');
        cy.getBySel('packShardsForm-1').within(() => {
          cy.getBySel('shards-field-policy').contains(OSQUERY_POLICY);
          cy.get('#shardsPercentage1').should('have.value', '0');
        });
        cy.getBySel('policyIdsComboBox').within(() => {
          cy.contains(OSQUERY_POLICY).should('not.exist');
        });

        cy.getBySel('comboBoxInput').contains(OSQUERY_POLICY).should('exist');
        cy.getBySel('policyIdsComboBox').click();
        cy.get('[data-test-subj="packShardsForm-1"]').within(() => {
          cy.get(`[aria-label="Delete shards row"]`).click();
        });
        cy.getBySel('comboBoxInput').contains(OSQUERY_POLICY).should('not.exist');
        cy.getBySel('policyIdsComboBox').click();
        cy.contains(OSQUERY_POLICY).should('exist');
      });
    });
  });
});
