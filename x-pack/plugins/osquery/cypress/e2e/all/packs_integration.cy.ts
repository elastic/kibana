/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find } from 'lodash';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  ADD_PACK_HEADER_BUTTON,
  EDIT_PACK_HEADER_BUTTON,
  SAVE_PACK_BUTTON,
  POLICY_SELECT_COMBOBOX,
  TABLE_ROWS,
  UPDATE_PACK_BUTTON,
  formFieldInputSelector,
} from '../../screens/packs';
import { API_VERSIONS } from '../../../common/constants';
import { FLEET_AGENT_POLICIES, navigateTo } from '../../tasks/navigation';
import {
  checkActionItemsInResults,
  checkResults,
  deleteAndConfirm,
  selectAllAgents,
  submitQuery,
} from '../../tasks/live_query';
import { changePackActiveStatus, cleanupAllPrebuiltPacks } from '../../tasks/packs';
import {
  addIntegration,
  closeModalIfVisible,
  closeToastIfVisible,
  generateRandomStringName,
  interceptPackId,
  interceptAgentPolicyId,
} from '../../tasks/integrations';
import { DEFAULT_POLICY, OSQUERY_POLICY } from '../../screens/fleet';
import { LIVE_QUERY_EDITOR } from '../../screens/live_query';
import { cleanupPack, cleanupAgentPolicy } from '../../tasks/api_fixtures';
import { request } from '../../tasks/common';
import { ServerlessRoleName } from '../../support/roles';

describe('ALL - Packs', { tags: ['@ess', '@serverless'] }, () => {
  const integration = 'Osquery Manager';

  describe(
    'Validate that agent policy is getting removed from pack if we remove agent policy',
    { tags: ['@ess'] },
    () => {
      let AGENT_POLICY_NAME: string;
      let REMOVING_PACK: string;

      beforeEach(() => {
        cy.login(ServerlessRoleName.PLATFORM_ENGINEER);
        AGENT_POLICY_NAME = `PackTest` + generateRandomStringName(1)[0];
        REMOVING_PACK = 'removing-pack' + generateRandomStringName(1)[0];
      });

      it('add integration', () => {
        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains('Create agent policy').click();
        cy.get('input[placeholder*="Choose a name"]').type(AGENT_POLICY_NAME);
        cy.get('.euiFlyoutFooter').contains('Create agent policy').click();
        cy.contains(`Agent policy '${AGENT_POLICY_NAME}' created`);
        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains(AGENT_POLICY_NAME).click();
        cy.contains('Add integration').click();
        cy.getBySel('epmList.searchBar').type('osquery');
        cy.contains(integration).click();
        addIntegration(AGENT_POLICY_NAME);
        cy.contains('Add Elastic Agent later').click();
        navigateTo('app/osquery/packs');
        cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
        cy.get(formFieldInputSelector('name')).type(`${REMOVING_PACK}{downArrow}{enter}`);
        cy.getBySel(POLICY_SELECT_COMBOBOX).type(`${AGENT_POLICY_NAME}{downArrow}{enter}`);
        cy.getBySel(SAVE_PACK_BUTTON).click();
        closeToastIfVisible();
        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains(REMOVING_PACK).click();
        cy.contains(`${REMOVING_PACK} details`).should('exist');
        cy.get('span').contains('Edit').click();

        cy.getBySel('comboBoxInput').contains(AGENT_POLICY_NAME).should('exist');

        cy.visit(FLEET_AGENT_POLICIES);
        cy.contains(AGENT_POLICY_NAME).click();
        cy.get('.euiTableCellContent')
          .get('.euiPopover')
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
        cy.get('span').contains('Edit').click();

        cy.getBySel('comboBoxInput').should('have.value', '');
      });
    }
  );

  describe('Load prebuilt packs', { tags: ['@ess', '@serverless'] }, () => {
    afterEach(() => {
      cleanupAllPrebuiltPacks();
    });
    const PREBUILD_PACK_NAME = 'it-compliance';

    describe('', () => {
      beforeEach(() => {
        cy.login(ServerlessRoleName.SOC_MANAGER);
        navigateTo('/app/osquery/packs');
      });
      it('should load prebuilt packs', () => {
        cy.contains('Load Elastic prebuilt packs').click();
        cy.contains('Load Elastic prebuilt packs').should('not.exist');
        cy.wait(1000);
        cy.get(TABLE_ROWS).should('have.length.above', 5);
      });

      it('should be able to activate pack', () => {
        changePackActiveStatus(PREBUILD_PACK_NAME);
        changePackActiveStatus(PREBUILD_PACK_NAME);
      });

      it('should be able to add policy to it', () => {
        cy.contains(PREBUILD_PACK_NAME).click();
        cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
        cy.getBySel(POLICY_SELECT_COMBOBOX).type(`${DEFAULT_POLICY} {downArrow}{enter}`);
        cy.getBySel(UPDATE_PACK_BUTTON).click();
        cy.getBySel('confirmModalConfirmButton').click();
        cy.contains(`Successfully updated "${PREBUILD_PACK_NAME}" pack`);
      });

      it('should be able to activate pack with agent inside', () => {
        changePackActiveStatus(PREBUILD_PACK_NAME);
        changePackActiveStatus(PREBUILD_PACK_NAME);
      });
      it('should not be able to update prebuilt pack', () => {
        cy.contains(PREBUILD_PACK_NAME).click();
        cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
        cy.get(formFieldInputSelector('name')).should('be.disabled');
        cy.get(formFieldInputSelector('description')).should('be.disabled');
        cy.contains('Add Query').should('not.exist');
        cy.get('.euiTableRowCell--hasActions').should('not.exist');
      });
      it('should be able to delete prebuilt pack and add it again', () => {
        cy.contains(PREBUILD_PACK_NAME).click();
        cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
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
        cy.getBySel(LIVE_QUERY_EDITOR).should('not.exist');
        cy.getBySel('globalLoadingIndicator').should('not.exist');
        selectAllAgents();
        cy.getBySel('select-live-pack').click();
        cy.getBySel('select-live-pack').type('osquery-monitoring{downArrow}{enter}');
        submitQuery();
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
  });

  describe('Global packs', { tags: ['@ess', '@serverless'] }, () => {
    beforeEach(() => {
      cy.login(ServerlessRoleName.PLATFORM_ENGINEER);
      navigateTo('/app/osquery/packs');
    });

    // FLAKY: https://github.com/elastic/kibana/issues/171279
    describe.skip('add proper shard to policies packs config', () => {
      const globalPack = 'globalPack' + generateRandomStringName(1)[0];
      const agentPolicy = 'testGlobal' + generateRandomStringName(1)[0];
      let globalPackId: string;
      let agentPolicyId: string;

      beforeEach(() => {
        interceptPackId((pack) => {
          globalPackId = pack;
        });
        interceptAgentPolicyId((policyId) => {
          agentPolicyId = policyId;
        });
      });

      afterEach(() => {
        cleanupPack(globalPackId);
        cleanupAgentPolicy(agentPolicyId);
      });

      it('add global packs to policies', () => {
        cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
        cy.get(formFieldInputSelector('name')).type(`${globalPack}{downArrow}{enter}`);
        cy.getBySel(POLICY_SELECT_COMBOBOX).should('exist');
        cy.getBySel('osqueryPackTypeGlobal').click();
        cy.getBySel(POLICY_SELECT_COMBOBOX).should('not.exist');
        cy.getBySel(SAVE_PACK_BUTTON).click();
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
        closeToastIfVisible();
        cy.contains(agentPolicy).click();
        cy.contains('Add integration').click();
        cy.getBySel('epmList.searchBar').type('osquery');
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

      beforeEach(() => {
        interceptPackId((pack) => {
          shardPackId = pack;
        });
      });

      afterEach(() => {
        cleanupPack(shardPackId);
      });

      it('', () => {
        const shardPack = 'shardPack' + generateRandomStringName(1)[0];

        cy.getBySel(ADD_PACK_HEADER_BUTTON).click();
        cy.get(formFieldInputSelector('name')).type(`${shardPack}{downArrow}{enter}`);

        cy.contains('Partial deployment (shards)').click();
        cy.getBySel('packShardsForm-0').within(() => {
          cy.getBySel('shards-field-policy').type(`${DEFAULT_POLICY}{downArrow}{enter}`);
          cy.get('#shardsPercentage0').type('{backspace}{backspace}5');
        });
        cy.getBySel('packShardsForm-1').within(() => {
          cy.getBySel('shards-field-policy').type(`${OSQUERY_POLICY}{downArrow}{enter}`);
          cy.get('#shardsPercentage1').type('{backspace}{backspace}{backspace}');
        });
        cy.getBySel(SAVE_PACK_BUTTON).click();

        cy.contains(`Successfully created "${shardPack}" pack`);
        closeToastIfVisible();

        request<{ items: PackagePolicy[] }>({
          url: '/internal/osquery/fleet_wrapper/package_policies',
          headers: {
            'Elastic-Api-Version': API_VERSIONS.internal.v1,
          },
        }).then((response) => {
          const shardPolicy = response.body.items.find(
            (policy: PackagePolicy) => policy.name === `Policy for ${DEFAULT_POLICY}`
          );

          expect(shardPolicy?.inputs[0].config?.osquery.value.packs[shardPack]).to.deep.equal({
            shard: 15,
            queries: {},
          });
        });
        cy.getBySel('tablePaginationPopoverButton').click();
        cy.getBySel('tablePagination-50-rows').click();
        cy.contains(shardPack).click();
        cy.getBySel(EDIT_PACK_HEADER_BUTTON).click();
        cy.get('#shardsPercentage0').should('have.value', '15');
        cy.getBySel('packShardsForm-1').within(() => {
          cy.getBySel('shards-field-policy').find('input').should('value', OSQUERY_POLICY);
          cy.get('#shardsPercentage1').should('have.value', '0');
        });
        cy.getBySel(POLICY_SELECT_COMBOBOX).find('input').should('not.have.value', OSQUERY_POLICY);

        cy.getBySel('shards-field-policy').find(`input[value="${OSQUERY_POLICY}"]`).should('exist');
        cy.getBySel(POLICY_SELECT_COMBOBOX).click();
        cy.get('[data-test-subj="packShardsForm-1"]').within(() => {
          cy.get(`[aria-label="Delete shards row"]`).click();
        });
        cy.getBySel(POLICY_SELECT_COMBOBOX).contains(OSQUERY_POLICY).should('not.exist');
        cy.getBySel(POLICY_SELECT_COMBOBOX).click().type(`${OSQUERY_POLICY}{downArrow}{enter}`);
        cy.getBySel(POLICY_SELECT_COMBOBOX).contains(OSQUERY_POLICY).should('exist');
      });
    });
  });
});
