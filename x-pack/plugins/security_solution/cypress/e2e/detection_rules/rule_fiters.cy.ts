/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { login, visitWithoutDateRange } from '../../tasks/login';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import { findRuleRowInTable } from '../../tasks/rule_snoozing';

import { SECURITY_DETECTIONS_RULES_URL } from '../../urls/navigation';

import { RULES_MANAGEMENT_TABLE } from '../../screens/alerts_detection_rules';

import { waitForRulesTableToBeLoaded } from '../../tasks/alerts_detection_rules';

import { createRule } from '../../tasks/api_calls/rules';
import {
  deleteIndex,
  createIndex,
  indexDocument,
  waitForRulesToFinishExecution,
} from '../../tasks/api_calls/elasticsearch';

import { getNewRule } from '../../objects/rule';

export const expectRulesWithExecutionStatus = (status: string, expectedCount: number) => {
  cy.get(`[data-test-subj="ruleExecutionStatus"]:contains("${status}")`).should(
    'have.length',
    expectedCount
  );
};

export const filterByExecutionStatus = (status: string) => {
  cy.get('[data-test-subj="executionStatusFilterButton"]').click();
  cy.get(`[data-test-subj="executionStatusFilterOption"]:contains("${status}")`).click();
  cy.get('[data-test-subj="ruleName"]').should('have.length', 1);
  expectRulesWithExecutionStatus(status, 1);
};

describe('Rule management filters', () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    // Make sure persisted rules table state is cleared
    resetRulesTableState();
    deleteAlertsAndRules();
    esArchiverResetKibana();

    deleteIndex('test_index');

    createIndex('test_index', {
      '@timestamp': {
        type: 'date',
      },
    });

    indexDocument('test_index');

    createRule(
      getNewRule({ name: 'Successful rule', rule_id: 'successful_rule', index: ['test_index'] })
    );

    createRule(
      getNewRule({
        name: 'Warning rule',
        rule_id: 'warning_rule',
        index: ['non_existent_index'],
      })
    );

    createRule(
      getNewRule({
        name: 'Failed rule',
        rule_id: 'failed_rule',
        index: ['test_index'],
        // Setting a crazy large "Additional look-back time" to force a failure
        from: 'now-9007199254746990s',
      })
    );

    waitForRulesToFinishExecution(['successful_rule', 'warning_rule', 'failed_rule']);

    visitWithoutDateRange(SECURITY_DETECTIONS_RULES_URL);

    waitForRulesTableToBeLoaded();
  });

  describe('Last response filter', () => {
    it('Filters rules by last response', () => {
      findRuleRowInTable(RULES_MANAGEMENT_TABLE, 'Successful rule').should('exist');

      cy.get('[data-test-subj="ruleExecutionStatus"]').should('have.length', 3);

      expectRulesWithExecutionStatus('Succeeded', 1);
      expectRulesWithExecutionStatus('Warning', 1);
      expectRulesWithExecutionStatus('Failed', 1);

      filterByExecutionStatus('Succeeded');
      filterByExecutionStatus('Warning');
      filterByExecutionStatus('Failed');
    });
  });
});
