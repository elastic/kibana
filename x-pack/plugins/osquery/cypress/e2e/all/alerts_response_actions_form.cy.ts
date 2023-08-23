/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  cleanupPack,
  cleanupRule,
  loadPack,
  loadRule,
  multiQueryPackFixture,
  packFixture,
} from '../../tasks/api_fixtures';
import {
  RESPONSE_ACTIONS_ITEM_0,
  RESPONSE_ACTIONS_ITEM_1,
  RESPONSE_ACTIONS_ITEM_2,
  OSQUERY_RESPONSE_ACTION_ADD_BUTTON,
} from '../../tasks/response_actions';
import {
  checkActionItemsInResults,
  clickRuleName,
  inputQuery,
  typeInECSFieldInput,
} from '../../tasks/live_query';
import { closeDateTabIfVisible, closeToastIfVisible } from '../../tasks/integrations';
import { tag } from '../../tags';
import { ServerlessRoleName } from '../../support/roles';

describe(
  'Alert Event Details - Response Actions Form',
  { browser: 'electron', tags: [tag.ESS, tag.SERVERLESS] },
  () => {
    let multiQueryPackId: string;
    let multiQueryPackName: string;
    let ruleId: string;
    let ruleName: string;
    let packId: string;
    let packName: string;
    const packData = packFixture();
    const multiQueryPackData = multiQueryPackFixture();

    beforeEach(() => {
      loadPack(packData).then((data) => {
        packId = data.saved_object_id;
        packName = data.name;
      });
      loadPack(multiQueryPackData).then((data) => {
        multiQueryPackId = data.saved_object_id;
        multiQueryPackName = data.name;
      });
      loadRule().then((data) => {
        ruleId = data.id;
        ruleName = data.name;
      });
      cy.login(ServerlessRoleName.SOC_MANAGER);
    });
    afterEach(() => {
      cleanupPack(packId);
      cleanupPack(multiQueryPackId);
      cleanupRule(ruleId);
    });

    it('adds response actions with osquery with proper validation and form values', () => {
      cy.visit('/app/security/rules');
      clickRuleName(ruleName);
      cy.getBySel('editRuleSettingsLink').click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      closeDateTabIfVisible();
      cy.getBySel('edit-rule-actions-tab').click();
      cy.contains('Response actions are run on each rule execution.');
      cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('Query is a required field');
        inputQuery('select * from uptime1');
      });
      cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('Run a set of queries in a pack').click();
      });
      cy.contains('Save changes').click();
      cy.getBySel('response-actions-error')
        .within(() => {
          cy.contains('Pack is a required field');
        })
        .should('exist');
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('Pack is a required field');
        cy.getBySel('comboBoxInput').type(`${packName}{downArrow}{enter}`);
      });

      cy.getBySel(OSQUERY_RESPONSE_ACTION_ADD_BUTTON).click();

      cy.getBySel(RESPONSE_ACTIONS_ITEM_2).within(() => {
        cy.contains('Query is a required field');
        inputQuery('select * from uptime');
        cy.contains('Advanced').click();
        typeInECSFieldInput('message{downArrow}{enter}');
        cy.getBySel('osqueryColumnValueSelect').type('days{downArrow}{enter}');
        cy.wait(1000); // wait for the validation to trigger - cypress is way faster than users ;)
      });

      cy.getBySel('ruleEditSubmitButton').click();
      cy.contains(`${ruleName} was saved`).should('exist');
      closeToastIfVisible();

      cy.getBySel('editRuleSettingsLink').click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel('edit-rule-actions-tab').click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('select * from uptime1');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_2).within(() => {
        cy.contains('select * from uptime');
        cy.contains('Log message optimized for viewing in a log viewer');
        cy.contains('Days of uptime');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains(packName);
        cy.getBySel('comboBoxInput').type('{backspace}{enter}');
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('select * from uptime1');
        cy.getBySel('remove-response-action').click();
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains('Search for a pack to run');
        cy.contains('Pack is a required field');
        cy.getBySel('comboBoxInput').type(`${packName}{downArrow}{enter}`);
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('select * from uptime');
        cy.contains('Log message optimized for viewing in a log viewer');
        cy.contains('Days of uptime');
      });
      cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleSingleQuery');
      cy.getBySel('ruleEditSubmitButton').click();
      cy.wait('@saveRuleSingleQuery').should(({ request }) => {
        const oneQuery = [
          {
            interval: 3600,
            query: 'select * from uptime;',
            id: Object.keys(packData.queries)[0],
          },
        ];
        expect(request.body.response_actions[0].params.queries).to.deep.equal(oneQuery);
      });

      cy.contains(`${ruleName} was saved`).should('exist');
      closeToastIfVisible();

      cy.getBySel('editRuleSettingsLink').click();
      cy.getBySel('globalLoadingIndicator').should('not.exist');
      cy.getBySel('edit-rule-actions-tab').click();
      cy.getBySel(RESPONSE_ACTIONS_ITEM_0).within(() => {
        cy.contains(packName);
        cy.getBySel('comboBoxInput').type(`${multiQueryPackName}{downArrow}{enter}`);
        checkActionItemsInResults({
          cases: false,
          lens: false,
          discover: false,
          timeline: false,
        });
      });
      cy.getBySel(RESPONSE_ACTIONS_ITEM_1).within(() => {
        cy.contains('select * from uptime');
        cy.contains('Log message optimized for viewing in a log viewer');
        cy.contains('Days of uptime');
      });
      cy.intercept('PUT', '/api/detection_engine/rules').as('saveRuleMultiQuery');

      cy.contains('Save changes').click();
      cy.wait('@saveRuleMultiQuery').should(({ request }) => {
        const threeQueries = [
          {
            interval: 3600,
            query: 'SELECT * FROM memory_info;',
            platform: 'linux',
            id: Object.keys(multiQueryPackData.queries)[0],
          },
          {
            interval: 3600,
            query: 'SELECT * FROM system_info;',
            id: Object.keys(multiQueryPackData.queries)[1],
          },
          {
            interval: 10,
            query: 'select opera_extensions.* from users join opera_extensions using (uid);',
            id: Object.keys(multiQueryPackData.queries)[2],
          },
        ];
        expect(request.body.response_actions[0].params.queries).to.deep.equal(threeQueries);
      });
    });
  }
);
