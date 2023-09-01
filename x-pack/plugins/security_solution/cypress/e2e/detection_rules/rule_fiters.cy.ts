/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanKibana, resetRulesTableState, deleteAlertsAndRules } from '../../tasks/common';
import { login, visitSecurityDetectionRulesPage } from '../../tasks/login';
import { esArchiverResetKibana } from '../../tasks/es_archiver';
import {
  expectRulesWithExecutionStatus,
  filterByExecutionStatus,
  expectNumberOfRulesShownOnPage,
} from '../../tasks/rule_filters';

import { createRule, waitForRulesToFinishExecution } from '../../tasks/api_calls/rules';
import { deleteIndex, createIndex, createDocument } from '../../tasks/api_calls/elasticsearch';
import { getNewRule } from '../../objects/rule';
import { disableAutoRefresh } from '../../tasks/alerts_detection_rules';

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
  });

  describe('Last response filter', () => {
    it('Filters rules by last response', function () {
      deleteIndex('test_index');

      createIndex('test_index', {
        '@timestamp': {
          type: 'date',
        },
      });

      createDocument('test_index', {});

      createRule(
        getNewRule({
          name: 'Successful rule',
          rule_id: 'successful_rule',
          index: ['test_index'],
          enabled: true,
        })
      );

      createRule(
        getNewRule({
          name: 'Warning rule',
          rule_id: 'warning_rule',
          index: ['non_existent_index'],
          enabled: true,
        })
      );

      createRule(
        getNewRule({
          name: 'Failed rule',
          rule_id: 'failed_rule',
          index: ['test_index'],
          // Setting a crazy large "Additional look-back time" to force a failure
          from: 'now-9007199254746990s',
          enabled: true,
        })
      );

      waitForRulesToFinishExecution(['successful_rule', 'warning_rule', 'failed_rule'], new Date());

      visitSecurityDetectionRulesPage();
      disableAutoRefresh();

      // Initial table state - before filtering by status
      expectNumberOfRulesShownOnPage(3);
      expectRulesWithExecutionStatus(1, 'Succeeded');
      expectRulesWithExecutionStatus(1, 'Warning');
      expectRulesWithExecutionStatus(1, 'Failed');

      // Table state after filtering by Succeeded status
      filterByExecutionStatus('Succeeded');
      expectNumberOfRulesShownOnPage(1);
      expectRulesWithExecutionStatus(1, 'Succeeded');

      // Table state after filtering by Warning status
      filterByExecutionStatus('Warning');
      expectNumberOfRulesShownOnPage(1);
      expectRulesWithExecutionStatus(1, 'Warning');

      // Table state after filtering by Failed status
      filterByExecutionStatus('Failed');
      expectNumberOfRulesShownOnPage(1);
      expectRulesWithExecutionStatus(1, 'Failed');
    });
  });
});
