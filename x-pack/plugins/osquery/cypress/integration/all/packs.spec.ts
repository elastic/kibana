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
import { getSavedQueriesDropdown } from '../../screens/live_query';

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
      login();
      navigateTo('/app/osquery');
    });

    after(() => {
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'saved_query');
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_1');
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_2');
      runKbnArchiverScript(ArchiverMethod.UNLOAD, 'ecs_mapping_3');
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
      getSavedQueriesDropdown().click().type(`${SAVED_QUERY_ID}{downArrow}{enter}`);
      cy.react('EuiFormRow', { props: { label: 'Interval (s)' } })
        .click()
        .clear()
        .type('500');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(SAVED_QUERY_ID);
      findAndClickButton('Save pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
      cy.contains(PACK_NAME);
    });

    it('to click the edit button and edit pack', () => {
      preparePack(PACK_NAME);
      findAndClickButton('Edit');
      cy.contains(`Edit ${PACK_NAME}`);
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      inputQuery('select * from uptime');
      findFormFieldByRowsLabelAndType('ID', SAVED_QUERY_ID);
      cy.contains('ID must be unique').should('exist');
      findFormFieldByRowsLabelAndType('ID', NEW_QUERY_NAME);
      cy.contains('ID must be unique').should('not.exist');
      cy.react('EuiFlyoutFooter').react('EuiButton').contains('Save').click();
      cy.react('EuiTableRow').contains(NEW_QUERY_NAME);
      findAndClickButton('Update pack');
      cy.contains('Save and deploy changes');
      findAndClickButton('Save and deploy changes');
    });

    it('should trigger validation when saved query is being chosen', () => {
      preparePack(PACK_NAME);
      findAndClickButton('Edit');
      findAndClickButton('Add query');
      cy.contains('Attach next query');
      cy.contains('ID must be unique').should('not.exist');
      getSavedQueriesDropdown().click().type(`${SAVED_QUERY_ID}{downArrow}{enter}`);
      cy.contains('ID must be unique').should('exist');
      cy.react('EuiFlyoutFooter').react('EuiButtonEmpty').contains('Cancel').click();
    });
    // THIS TESTS TAKES TOO LONG FOR NOW - LET ME THINK IT THROUGH
    it.skip('to click the icon and visit discover', () => {
      preparePack(PACK_NAME);
      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: SAVED_QUERY_ID } },
      }).click();
      cy.getBySel('superDatePickerToggleQuickMenuButton').click();
      cy.getBySel('superDatePickerToggleRefreshButton').click();
      cy.getBySel('superDatePickerRefreshIntervalInput').clear().type('10');
      cy.get('button').contains('Apply').click();
      cy.getBySel('discoverDocTable', { timeout: 60000 }).contains(
        `pack_${PACK_NAME}_${SAVED_QUERY_ID}`
      );
    });
    it('by clicking in Lens button', () => {
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
      }).click();
      cy.window()
        .its('open')
        .then(() => {
          cy.visit(lensUrl);
        });
      cy.getBySel('lnsWorkspace');
      cy.getBySel('breadcrumbs').contains(`Action pack_${PACK_NAME}_${SAVED_QUERY_ID} results`);
    });

    // strange behaviour with modal
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
      cy.contains(`${PACK_NAME} details`);
      cy.contains(/^No items found/);
    });

    it('enable changing saved queries and ecs_mappings', () => {
      preparePack(PACK_NAME);
      cy.contains(/^Edit$/).click();

      findAndClickButton('Add query');

      getSavedQueriesDropdown().click().type('Multiple {downArrow} {enter}');
      cy.contains('Custom key/value pairs');
      cy.contains('Days of uptime');
      cy.contains('List of keywords used to tag each');
      cy.contains('Seconds of uptime');
      cy.contains('Client network address.');
      cy.contains('Total uptime seconds');

      getSavedQueriesDropdown().click().type('NOMAPPING {downArrow} {enter}');
      cy.contains('Custom key/value pairs').should('not.exist');
      cy.contains('Days of uptime').should('not.exist');
      cy.contains('List of keywords used to tag each').should('not.exist');
      cy.contains('Seconds of uptime').should('not.exist');
      cy.contains('Client network address.').should('not.exist');
      cy.contains('Total uptime seconds').should('not.exist');

      getSavedQueriesDropdown().click().type('ONE_MAPPING {downArrow} {enter}');
      cy.contains('Name of the continent');
      cy.contains('Seconds of uptime');

      findAndClickButton('Save');
      cy.react('CustomItemAction', {
        props: { index: 0, item: { id: 'ONE_MAPPING_CHANGED' } },
      }).click();
      cy.contains('Name of the continent');
      cy.contains('Seconds of uptime');
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
    const AGENT_NAME = 'PackTest2';
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
      cy.contains(REMOVING_PACK).click();
      cy.contains(`${REMOVING_PACK} details`);
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
      navigateTo('app/osquery/packs');
      cy.contains(REMOVING_PACK).click();
      cy.contains(`${REMOVING_PACK} details`);
      cy.wait(1000);
      findAndClickButton('Edit');
      cy.react('EuiComboBoxInput', { props: { value: '' } }).should('exist');
    });
  });
});
