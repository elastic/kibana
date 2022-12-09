/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectedExportedRule, getNewRule } from '../../objects/rule';

import {
  TOASTER_BODY,
  MODAL_CONFIRMATION_BODY,
  MODAL_CONFIRMATION_BTN,
} from '../../screens/alerts_detection_rules';

import {
  exportFirstRule,
  loadPrebuiltDetectionRulesFromHeaderBtn,
  filterByElasticRules,
  selectNumberOfRules,
  bulkExportRules,
  selectAllRules,
} from '../../tasks/alerts_detection_rules';
import { createExceptionList, deleteExceptionList } from '../../tasks/api_calls/exceptions';
import { getExceptionList } from '../../objects/exception';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { getAvailablePrebuiltRulesCount } from '../../tasks/api_calls/prebuilt_rules';

const exceptionList = getExceptionList();

describe('Export rules', () => {
  before(() => {
    cleanKibana();
    login();
  });

  beforeEach(() => {
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    // Rules get exported via _bulk_action endpoint
    cy.intercept('POST', '/api/detection_engine/rules/_bulk_action').as('bulk_action');
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    createCustomRule(getNewRule()).as('ruleResponse');
  });

  it('Exports a custom rule', function () {
    exportFirstRule();
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.body).should('eql', expectedExportedRule(this.ruleResponse));
      cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
    });
  });

  it('shows a modal saying that no rules can be exported if all the selected rules are prebuilt', function () {
    const expectedElasticRulesCount = 7;

    loadPrebuiltDetectionRulesFromHeaderBtn();

    filterByElasticRules();
    selectNumberOfRules(expectedElasticRulesCount);
    bulkExportRules();

    cy.get(MODAL_CONFIRMATION_BODY).contains(
      `${expectedElasticRulesCount} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
    );
  });

  it('exports only custom rules', function () {
    const expectedNumberCustomRulesToBeExported = 1;

    loadPrebuiltDetectionRulesFromHeaderBtn();

    selectAllRules();
    bulkExportRules();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      cy.get(MODAL_CONFIRMATION_BODY).contains(
        `${availablePrebuiltRulesCount} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
      );
    });

    // proceed with exporting only custom rules
    cy.get(MODAL_CONFIRMATION_BTN)
      .should('have.text', `Export ${expectedNumberCustomRulesToBeExported} custom rule`)
      .click();

    getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
      const totalNumberOfRules =
        expectedNumberCustomRulesToBeExported + availablePrebuiltRulesCount;
      cy.get(TOASTER_BODY).should(
        'contain',
        `Successfully exported ${expectedNumberCustomRulesToBeExported} of ${totalNumberOfRules} rules. Prebuilt rules were excluded from the resulting file.`
      );
    });
  });

  context('rules with exceptions', () => {
    beforeEach(() => {
      deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
      // create rule with exceptions
      createExceptionList(exceptionList, exceptionList.list_id).then((response) =>
        createCustomRule(
          {
            ...getNewRule(),
            name: 'rule with exceptions',
            exceptionLists: [
              {
                id: response.body.id,
                list_id: exceptionList.list_id,
                type: exceptionList.type,
                namespace_type: exceptionList.namespace_type,
              },
            ],
          },
          '2'
        )
      );
    });

    it('exports custom rules with exceptions', function () {
      // one rule with exception, one without it
      const expectedNumberCustomRulesToBeExported = 2;

      loadPrebuiltDetectionRulesFromHeaderBtn();

      selectAllRules();
      bulkExportRules();

      // should display correct number of custom rules when one of them has exceptions
      cy.get(MODAL_CONFIRMATION_BTN)
        .should('have.text', `Export ${expectedNumberCustomRulesToBeExported} custom rules`)
        .click();

      cy.get(TOASTER_BODY).should(
        'contain',
        `Successfully exported ${expectedNumberCustomRulesToBeExported}`
      );
    });
  });
});
