/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_AGENT_POLICIES, navigateTo } from '../../tasks/navigation';
import {
  deleteAndConfirm,
  findAndClickButton,
  findFormFieldByRowsLabelAndType,
  inputQuery,
} from '../../tasks/live_query';
import { login } from '../../tasks/login';
import { ArchiverMethod, runKbnArchiverScript } from '../../tasks/archiver';
import { preparePack } from '../../tasks/packs';
import { addIntegration, closeModalIfVisible } from '../../tasks/integrations';
import { DEFAULT_POLICY } from '../../screens/fleet';
import { getIdFormField, getSavedQueriesDropdown } from '../../screens/live_query';
import { ROLES } from '../../test';
import { getRandomInt } from '../../tasks/helpers';

describe('ALL - Packs', () => {
  const integration = 'Osquery Manager';
  const SAVED_QUERY_ID = 'Saved-Query-Id';
  const PACK_NAME = 'Pack-name';
  const NEW_QUERY_NAME = 'new-query-name';

  describe('Create and edit a pack', () => {
    before(() => {
      runKbnArchiverScript(ArchiverMethod.LOAD, 'saved_query');
      runKbnArchiverScript(ArchiverMethod.LOAD, 'ecs_mapping_1');
      runKbnArchiverScript(ArchiverMethod.LOAD, 'ecs_mapping_2');
      runKbnArchiverScript(ArchiverMethod.LOAD, 'ecs_mapping_3');
    });

    beforeEach(() => {
      login(ROLES.soc_manager);
      navigateTo('/app/osquery');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_1');
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_2');
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_3');
    });

    it('Check if result type is correct', () => {
      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', 'ResultType');
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
      cy.react('ScheduledQueryNameComponent', {
        props: {
          name: 'ResultType',
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
      cy.request('/internal/osquery/fleet_wrapper/package_policies').then((response) => {
        const item = response.body.items.find(
          (policy: { policy_id: string }) => policy.policy_id === 'fleet-server-policy'
        );

        expect(item.inputs[0].config.osquery.value.packs.ResultType.queries).to.deep.equal(queries);
      });
    });
    it('should add a pack from a saved query', () => {
      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', PACK_NAME);
      findFormFieldByRowsLabelAndType('Description (optional)', 'Pack description');
      findFormFieldByRowsLabelAndType('Scheduled agent policies (optional)', DEFAULT_POLICY);
      cy.react('List').first().click();
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      getSavedQueriesDropdown().type(`${SAVED_QUERY_ID}{downArrow}{enter}`);
      cy.react('EuiFormRow', { props: { label: 'Interval (s)' } })
        .click()
        .clear()
        .type('5');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(SAVED_QUERY_ID);
      findAndClickButton('Save pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
      cy.contains(PACK_NAME);
      cy.contains(`Successfully created "${PACK_NAME}" pack`);
      cy.getBySel('toastCloseButton').click();
    });

    it('to click the edit button and edit pack', () => {
      preparePack(PACK_NAME);
      findAndClickButton('Edit');
      cy.contains(`Edit ${PACK_NAME}`);
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      inputQuery('select * from uptime');
      findFormFieldByRowsLabelAndType('ID', SAVED_QUERY_ID);
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.contains('ID must be unique').should('exist');
      findFormFieldByRowsLabelAndType('ID', NEW_QUERY_NAME);
      cy.contains('ID must be unique').should('not.exist');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(NEW_QUERY_NAME);
      findAndClickButton('Update pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
      cy.contains(`Successfully updated "${PACK_NAME}" pack`);
      cy.getBySel('toastCloseButton').click();
    });

    it('should trigger validation when saved query is being chosen', () => {
      preparePack(PACK_NAME);
      findAndClickButton('Edit');
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      cy.contains('ID must be unique').should('not.exist');
      getSavedQueriesDropdown().type(`${SAVED_QUERY_ID}{downArrow}{enter}`);
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.contains('ID must be unique').should('exist');
      cy.react('EuiFlyoutFooter').react('EuiButtonEmpty').contains('Cancel').click();
    });

    it.skip('should open lens in new tab', () => {
      let lensUrl = '';
      cy.window().then((win) => {
        cy.stub(win, 'open')
          .as('windowOpen')
          .callsFake((url) => {
            lensUrl = url;
          });
      });
      preparePack(PACK_NAME);
      cy.react('CustomItemAction', {
        props: { index: 1, item: { id: SAVED_QUERY_ID } },
      })
        .should('exist')
        .click();
      cy.window()
        .its('open')
        .then(() => {
          cy.visit(lensUrl);
        });
      cy.getBySel('lnsWorkspace').should('exist');
      cy.getBySel('breadcrumbs').contains(`Action pack_${PACK_NAME}_${SAVED_QUERY_ID} results`);
    });

    // TODO extremely strange behaviour with Cypress not finding Discover's page elements
    // it('should open discover in new tab', () => {
    //   preparePack(PACK_NAME);
    //   cy.wait(1000);
    //   cy.react('CustomItemAction', {
    //     props: { index: 0, item: { id: SAVED_QUERY_ID } },
    //   })
    //     .should('exist')
    //     .within(() => {
    //       cy.get('a')
    //         .should('have.attr', 'href')
    //         .then(($href) => {
    //           // @ts-expect-error-next-line href string - check types
    //           cy.visit($href);
    //           cy.getBySel('breadcrumbs').contains('Discover').should('exist');
    //           cy.contains(`action_id: pack_${PACK_NAME}_${SAVED_QUERY_ID}`);
    //           cy.getBySel('superDatePickerToggleQuickMenuButton').click();
    //           cy.getBySel('superDatePickerCommonlyUsed_Today').click();
    //           cy.getBySel('discoverDocTable', { timeout: 60000 }).contains(
    //             `pack_${PACK_NAME}_${SAVED_QUERY_ID}`
    //           );
    //         });
    //     });
    // });

    it('activate and deactive pack', () => {
      cy.contains('Packs').click();
      cy.react('ActiveStateSwitchComponent', {
        props: { item: { attributes: { name: PACK_NAME } } },
      }).click();
      cy.contains(`Successfully deactivated "${PACK_NAME}" pack`).should('not.exist');
      cy.contains(`Successfully deactivated "${PACK_NAME}" pack`).should('exist');
      cy.react('ActiveStateSwitchComponent', {
        props: { item: { attributes: { name: PACK_NAME } } },
      }).click();
      cy.getBySel('confirmModalConfirmButton').click();
      cy.contains(`Successfully activated "${PACK_NAME}" pack`).should('not.exist');
      cy.contains(`Successfully activated "${PACK_NAME}" pack`).should('exist');
    });

    it.skip('should verify that packs are triggered', () => {
      cy.waitForReact();
      preparePack(PACK_NAME);
      cy.contains(`${PACK_NAME} details`).should('exist');

      cy.getBySel('docsLoading').should('exist');
      cy.getBySel('docsLoading').should('not.exist');
      cy.react('ScheduledQueryLastResults')
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
      cy.getBySel('packResultsErrorsEmpty').should('have.length', 2);
    });

    it('delete all queries in the pack', () => {
      preparePack(PACK_NAME);
      cy.contains(/^Edit$/).click();

      cy.getBySel('checkboxSelectAll').click();

      cy.contains(/^Delete \d+ quer(y|ies)/).click();
      cy.contains(/^Update pack$/).click();
      cy.react('EuiButtonDisplay')
        .contains(/^Save and deploy changes$/)
        .click();
      cy.contains(`${PACK_NAME}`).click();
      cy.contains(`${PACK_NAME} details`).should('exist');
      cy.contains(/^No items found/).should('exist');
    });

    it('enable changing saved queries and ecs_mappings', () => {
      preparePack(PACK_NAME);
      cy.contains(/^Edit$/).click();

      findAndClickButton('Add query');

      getSavedQueriesDropdown().type('Multiple {downArrow} {enter}');
      cy.contains('Custom key/value pairs').should('exist');
      cy.contains('Days of uptime').should('exist');
      cy.contains('List of keywords used to tag each').should('exist');
      cy.contains('Seconds of uptime').should('exist');
      cy.contains('Client network address.').should('exist');
      cy.contains('Total uptime seconds').should('exist');
      cy.getBySel('ECSMappingEditorForm').should('have.length', 4);

      getSavedQueriesDropdown().type('NOMAPPING {downArrow} {enter}');
      cy.contains('Custom key/value pairs').should('not.exist');
      cy.contains('Days of uptime').should('not.exist');
      cy.contains('List of keywords used to tag each').should('not.exist');
      cy.contains('Seconds of uptime').should('not.exist');
      cy.contains('Client network address.').should('not.exist');
      cy.contains('Total uptime seconds').should('not.exist');
      cy.getBySel('ECSMappingEditorForm').should('have.length', 1);

      getSavedQueriesDropdown().type('ONE_MAPPING {downArrow} {enter}');
      cy.contains('Name of the continent').should('exist');
      cy.contains('Seconds of uptime').should('exist');
      cy.getBySel('ECSMappingEditorForm').should('have.length', 2);

      findAndClickButton('Save');
      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: 'ONE_MAPPING_CHANGED' } },
      }).click();
      cy.contains('Name of the continent').should('exist');
      cy.contains('Seconds of uptime').should('exist');
    });

    it('to click delete button', () => {
      preparePack(PACK_NAME);
      findAndClickButton('Edit');
      deleteAndConfirm('pack');
    });
  });

  describe('Validate that agent is getting removed from pack if we remove agent', () => {
    beforeEach(() => {
      login();
    });
    const randomNumber = getRandomInt();
    const AGENT_NAME = `PackTest${randomNumber}`;
    const REMOVING_PACK = 'removing-pack';
    it('add integration', () => {
      cy.visit(FLEET_AGENT_POLICIES);
      cy.contains('Create agent policy').click();
      cy.get('input[placeholder*="Choose a name"]').type(AGENT_NAME);
      cy.get('.euiFlyoutFooter').contains('Create agent policy').click();
      cy.contains(`Agent policy '${AGENT_NAME}' created`);
      cy.visit(FLEET_AGENT_POLICIES);
      cy.contains(AGENT_NAME).click();
      cy.contains('Add integration').click();
      cy.contains(integration).click();
      addIntegration(AGENT_NAME);
      cy.contains('Add Elastic Agent later').click();
      navigateTo('app/osquery/packs');
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', REMOVING_PACK);
      findFormFieldByRowsLabelAndType('Scheduled agent policies (optional)', AGENT_NAME);
      findAndClickButton('Save pack');

      cy.getBySel('toastCloseButton').click();
      cy.react('ScheduledQueryNameComponent', { props: { name: REMOVING_PACK } }).click();
      cy.contains(`${REMOVING_PACK} details`).should('exist');
      findAndClickButton('Edit');
      cy.react('EuiComboBoxInput', { props: { value: AGENT_NAME } }).should('exist');

      cy.visit(FLEET_AGENT_POLICIES);
      cy.contains(AGENT_NAME).click();
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
  });

  describe('Load prebuilt packs', () => {
    beforeEach(() => {
      login(ROLES.soc_manager);
      navigateTo('/app/osquery/packs');
    });

    it('should load prebuilt packs', () => {
      cy.contains('Load Elastic prebuilt packs').click();
      cy.contains('Load Elastic prebuilt packs').should('not.exist');
      cy.wait(1000);
      cy.react('EuiTableRow').should('have.length.above', 5);
    });
  });

  describe('Global packs', () => {
    beforeEach(() => {
      login();
      navigateTo('/app/osquery/packs');
    });

    it('add global packs to polciies', () => {
      const globalPack = 'globalPack';
      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', globalPack);
      cy.getBySel('osqueryPackTypeGlobal').click();
      findAndClickButton('Save pack');

      cy.contains(globalPack);
      cy.contains(`Successfully created "${globalPack}" pack`);
      cy.getBySel('toastCloseButton').click();

      cy.visit(FLEET_AGENT_POLICIES);
      cy.contains('Create agent policy').click();
      cy.getBySel('createAgentPolicyNameField').type('testGlobal');
      cy.getBySel('createAgentPolicyFlyoutBtn').click();
      cy.contains(/^Agent policy 'testGlobal' created$/).click();
      cy.contains('testGlobal').click();
      cy.contains('Add integration').click();
      cy.contains(integration).click();
      addIntegration('testGlobal');
      cy.contains('Add Elastic Agent later').click();
      cy.contains('osquery_manager-');
      cy.request('/internal/osquery/fleet_wrapper/package_policies').then((response) => {
        const item = response.body.items[0];

        expect(item.inputs[0].config.osquery.value.packs.globalPack).to.deep.equal({
          shard: 100,
          queries: {},
        });
      });
      cy.visit('/app/fleet/policies');
      cy.contains('td', 'testGlobal')
        .parent()
        .within(() => {
          cy.contains('rev. 2').click();
        });
    });
    it('add proper shard to policies packs config', () => {
      const shardPack = 'shardPack';
      cy.contains('Packs').click();
      findAndClickButton('Add pack');
      findFormFieldByRowsLabelAndType('Name', shardPack);

      cy.contains('Partial deployment (shards)').click();
      cy.getBySel('packShardsForm-0').within(() => {
        cy.getBySel('shards-field-policy').type('Default{downArrow}{enter}');
        cy.get('#shardsPercentage0').type('{backspace}{backspace}5');
      });
      cy.getBySel('packShardsForm-1').within(() => {
        cy.getBySel('shards-field-policy').type('{downArrow}{enter}');
        cy.get('#shardsPercentage1').type('{backspace}{backspace}{backspace}');
      });
      findAndClickButton('Save pack');

      cy.contains(`Successfully created "${shardPack}" pack`);
      cy.getBySel('toastCloseButton').click();

      cy.request('/internal/osquery/fleet_wrapper/package_policies').then((response) => {
        const shardPolicy = response.body.items.find(
          (policy: { policy_id: string }) => policy.policy_id === 'fleet-server-policy'
        );

        expect(shardPolicy.inputs[0].config.osquery.value.packs[shardPack]).to.deep.equal({
          shard: 15,
          queries: {},
        });
      });
      cy.contains(shardPack).click();
      cy.contains('Edit').click();
      cy.get('#shardsPercentage0').should('have.value', '15');
      cy.getBySel('packShardsForm-1').within(() => {
        cy.getBySel('shards-field-policy').contains('testGlobal');
        cy.get('#shardsPercentage1').should('have.value', '0');
      });
      cy.getBySel('policyIdsComboBox').within(() => {
        cy.contains('testGlobal').should('not.exist');
      });
    });
  });
});
