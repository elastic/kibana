/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import type { RuleResponse } from '../../../common/detection_engine/rule_schema';
import { getIndexPatterns, getNewRule } from '../../objects/rule';

import {
  TOASTER_BODY,
  MODAL_CONFIRMATION_BODY,
  MODAL_CONFIRMATION_BTN,
  TOASTER,
} from '../../screens/alerts_detection_rules';

import {
  exportFirstRule,
  loadPrebuiltDetectionRulesFromHeaderBtn,
  filterByElasticRules,
  selectNumberOfRules,
  bulkExportRules,
  selectAllRules,
  importRules,
  expectManagementTableRules,
  exportRule,
  waitForRuleExecution,
} from '../../tasks/alerts_detection_rules';
import { createExceptionList, deleteExceptionList } from '../../tasks/api_calls/exceptions';
import { getExceptionList } from '../../objects/exception';
import { createCustomRule } from '../../tasks/api_calls/rules';
import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';

import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../urls/navigation';
import { getAvailablePrebuiltRulesCount } from '../../tasks/api_calls/prebuilt_rules';

const EXPORTED_RULES_FILENAME = 'rules_export.ndjson';
const exceptionList = getExceptionList();

describe('Export rules', () => {
  const downloadsFolder = Cypress.config('downloadsFolder');

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
    createCustomRule(getNewRule({ name: 'Rule to export' })).as('ruleResponse');
  });

  it('exports a custom rule', function () {
    exportFirstRule();
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.body).should('eql', expectedExportedRule(this.ruleResponse));
      cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');
    });
  });

  it('creates an importable file from executed rule', () => {
    createCustomRule(
      getNewRule({ id: 'enabled-rule-1', name: 'Enabled rule to export', enabled: true })
    );

    waitForRuleExecution('Enabled rule to export');

    exportRule('Enabled rule to export');

    cy.get(TOASTER).should('have.text', 'Rules exported');
    cy.get(TOASTER_BODY).should('have.text', 'Successfully exported 1 of 1 rule.');

    deleteAlertsAndRules();
    importRules(path.join(downloadsFolder, EXPORTED_RULES_FILENAME));

    cy.get(TOASTER).should('have.text', 'Successfully imported 1 rule');
    expectManagementTableRules(['Enabled rule to export']);
  });

  it('shows a modal saying that no rules can be exported if all the selected rules are prebuilt', () => {
    const expectedElasticRulesCount = 7;

    loadPrebuiltDetectionRulesFromHeaderBtn();

    filterByElasticRules();
    selectNumberOfRules(expectedElasticRulesCount);
    bulkExportRules();

    cy.get(MODAL_CONFIRMATION_BODY).contains(
      `${expectedElasticRulesCount} prebuilt Elastic rules (exporting prebuilt rules is not supported)`
    );
  });

  it('exports only custom rules', () => {
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
          getNewRule({
            id: '2',
            name: 'rule with exceptions',
            exceptionLists: [
              {
                id: response.body.id,
                list_id: exceptionList.list_id,
                type: exceptionList.type,
                namespace_type: exceptionList.namespace_type,
              },
            ],
          })
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

export const expectedExportedRule = (ruleResponse: Cypress.Response<RuleResponse>): string => {
  const {
    id,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    description,
    name,
    risk_score: riskScore,
    severity,
    tags,
    timeline_id: timelineId,
    timeline_title: timelineTitle,
  } = ruleResponse.body;

  let query: string | undefined;
  if (ruleResponse.body.type === 'query') {
    query = ruleResponse.body.query;
  }

  // NOTE: Order of the properties in this object matters for the tests to work.
  // TODO: Follow up https://github.com/elastic/kibana/pull/137628 and add an explicit type to this object
  // without using Partial
  const rule: Partial<RuleResponse> = {
    id,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: 'elastic',
    name,
    tags,
    interval: '100m',
    enabled: false,
    description,
    risk_score: riskScore,
    severity,
    output_index: '',
    author: [],
    false_positives: [],
    from: 'now-50000h',
    rule_id: 'rule_testing',
    max_signals: 100,
    risk_score_mapping: [],
    severity_mapping: [],
    threat: [],
    to: 'now',
    references: [],
    version: 1,
    exceptions_list: [],
    immutable: false,
    related_integrations: [],
    required_fields: [],
    setup: '',
    type: 'query',
    language: 'kuery',
    index: getIndexPatterns(),
    query,
    throttle: 'no_actions',
    actions: [],
    timeline_id: timelineId,
    timeline_title: timelineTitle,
  };

  // NOTE: Order of the properties in this object matters for the tests to work.
  const details = {
    exported_count: 1,
    exported_rules_count: 1,
    missing_rules: [],
    missing_rules_count: 0,
    exported_exception_list_count: 0,
    exported_exception_list_item_count: 0,
    missing_exception_list_item_count: 0,
    missing_exception_list_items: [],
    missing_exception_lists: [],
    missing_exception_lists_count: 0,
    exported_action_connector_count: 0,
    missing_action_connection_count: 0,
    missing_action_connections: [],
    excluded_action_connection_count: 0,
    excluded_action_connections: [],
  };

  return `${JSON.stringify(rule)}\n${JSON.stringify(details)}\n`;
};
