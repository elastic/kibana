/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { cleanKibana, resetRulesTableState } from '../../tasks/common';
import { login, visit } from '../../tasks/login';
import {
  DASHBOARDS_URL,
  KIBANA_HOME,
  SECURITY_DETECTIONS_RULES_MANAGEMENT_URL,
  SECURITY_DETECTIONS_RULES_MONITORING_URL,
  SECURITY_DETECTIONS_RULES_URL,
} from '../../urls/navigation';
import { getNewRule } from '../../objects/rule';
import {
  expectNumberOfRules,
  expectToContainRule,
  filterByCustomRules,
  filterBySearchTerm,
  filterByTags,
  goToRuleDetails,
  expectFilterSearchTerm,
  expectFilterByTags,
  expectFilterByCustomRules,
  expectRulesManagementTab,
  expectRulesMonitoringTab,
  expectNoFilterByTags,
  expectNoFilterByElasticOrCustomRules,
  expectFilterByDisabledRules,
  expectNoFilterByEnabledOrDisabledRules,
  filterByDisabledRules,
  expectFilterByPrebuiltRules,
  expectFilterByEnabledRules,
} from '../../tasks/alerts_detection_rules';
import { RULES_MANAGEMENT_TABLE } from '../../screens/alerts_detection_rules';
import { createCustomRule } from '../../tasks/api_calls/rules';
import {
  expectRowsPerPage,
  expectTablePage,
  expectTableSorting,
  goToTablePage,
  setRowsPerPageTo,
  sortByTableColumn,
} from '../../tasks/table_pagination';

function createRule(id: string, name: string, tags?: string[], enabled = false): void {
  const rule = getNewRule();

  rule.name = name;
  rule.tags = tags;
  rule.enabled = enabled;

  createCustomRule(rule, id);
}

function createTestRules(): void {
  createRule('1', 'test 1', ['tag-a']);
  createRule('2', 'rule 1', ['tag-b']);
  createRule('3', 'rule 2', ['tag-b']);
  createRule('4', 'rule 3', ['tag-b', 'tag-c']);
  createRule('5', 'rule 4', ['tag-b']);
  createRule('6', 'rule 5', ['tag-b', 'tag-c']);
  createRule('7', 'rule 6', ['tag-b']);
  createRule('8', 'rule 7', ['tag-b'], true);
}

function visitRulesTableWithState(urlTableState: Record<string, unknown>): void {
  visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL, { qs: { rulesTable: encode(urlTableState) } });
}

function setStorageState(storageTableState: Record<string, unknown>): void {
  cy.window().then((win) => {
    win.sessionStorage.setItem('securitySolution.rulesTable', JSON.stringify(storageTableState));
  });
}

function changeRulesTableState(): void {
  filterBySearchTerm('rule');
  filterByTags(['tag-b']);
  filterByCustomRules();
  filterByDisabledRules();
  sortByTableColumn('Rule', 'asc');
  setRowsPerPageTo(5);
}

function expectRulesTableState(): void {
  expectFilterSearchTerm('rule');
  expectFilterByTags(['tag-b']);
  expectFilterByCustomRules();
  expectFilterByDisabledRules();
  expectTableSorting('Rule', 'asc');
  expectRowsPerPage(5);
}

function expectDefaultRulesTableState(): void {
  expectFilterSearchTerm('');
  expectNoFilterByTags();
  expectNoFilterByElasticOrCustomRules();
  expectNoFilterByEnabledOrDisabledRules();
  expectTableSorting('Enabled', 'desc');
  expectRowsPerPage(20);
  expectTablePage(1);
}

function expectManagementTableRules(ruleNames: string[]): void {
  expectNumberOfRules(RULES_MANAGEMENT_TABLE, ruleNames.length);

  for (const ruleName of ruleNames) {
    expectToContainRule(RULES_MANAGEMENT_TABLE, ruleName);
  }
}

describe('Persistent rules table state', () => {
  before(() => {
    cleanKibana();
    createTestRules();
    login();
  });

  beforeEach(() => {
    resetRulesTableState();
  });

  describe('while on a happy path', () => {
    it('activates management tab by default', () => {
      visit(SECURITY_DETECTIONS_RULES_URL);

      expectRulesManagementTab();
    });

    it('leads to displaying a rule according to the specified filters', () => {
      visitRulesTableWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        enabled: false,
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectManagementTableRules(['rule 6']);
    });

    it('loads from the url', () => {
      visitRulesTableWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        enabled: false,
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectRulesManagementTab();
      expectFilterSearchTerm('rule');
      expectFilterByTags(['tag-b']);
      expectFilterByCustomRules();
      expectFilterByDisabledRules();
      expectTableSorting('Rule', 'asc');
      expectRowsPerPage(5);
      expectTablePage(2);
    });

    it('loads from the session storage', () => {
      setStorageState({
        searchTerm: 'test',
        tags: ['tag-a'],
        source: 'prebuilt',
        enabled: true,
        field: 'severity',
        order: 'desc',
        perPage: 10,
      });

      visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

      expectRulesManagementTab();
      expectFilterSearchTerm('test');
      expectFilterByTags(['tag-a']);
      expectFilterByPrebuiltRules();
      expectFilterByEnabledRules();
      expectTableSorting('Severity', 'desc');
    });

    it('prefers url state over storage state', () => {
      setStorageState({
        searchTerm: 'test',
        tags: ['tag-c'],
        source: 'prebuilt',
        enabled: true,
        field: 'severity',
        order: 'desc',
        perPage: 10,
      });

      visitRulesTableWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        enabled: false,
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectRulesManagementTab();
      expectRulesTableState();
      expectTablePage(2);
    });

    describe('and on the rules management tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);
      });

      it('persists after reloading the page', () => {
        changeRulesTableState();
        goToTablePage(2);

        cy.reload();

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
      });

      it('persists after navigating back from a rule details page', () => {
        changeRulesTableState();
        goToTablePage(2);

        goToRuleDetails();
        cy.go('back');

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
      });

      it('persists after navigating to another page inside Security Solution', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(DASHBOARDS_URL);
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });

      it('persists after navigating to another page outside Security Solution', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(KIBANA_HOME);
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });
    });

    describe('and on the rules monitoring tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);
      });

      it('persists the selected tab', () => {
        changeRulesTableState();

        cy.reload();

        expectRulesMonitoringTab();
      });
    });
  });

  describe('upon state format upgrade', async () => {
    describe('and having state in the url', () => {
      it('ignores unsupported state key', () => {
        visitRulesTableWithState({
          someKey: 10,
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          enabled: false,
          field: 'name',
          order: 'asc',
          perPage: 5,
          page: 2,
        });

        expectRulesTableState();
        expectTablePage(2);
      });
    });

    describe('and having state in the session storage', () => {
      it('ignores unsupported state key', () => {
        setStorageState({
          someKey: 10,
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          enabled: false,
          field: 'name',
          order: 'asc',
          perPage: 5,
        });

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesTableState();
        expectTablePage(1);
      });
    });
  });

  describe('when persisted state is partially unavailable', () => {
    describe('and on the rules management tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);
      });

      it('persists after clearing the session storage', () => {
        changeRulesTableState();
        goToTablePage(2);

        cy.window().then((win) => {
          win.sessionStorage.clear();
        });
        cy.reload();

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
      });

      it('persists after clearing the url state', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });
    });
  });

  describe('when corrupted', () => {
    describe('and on the rules management tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);
      });

      it('persists after corrupting the session storage data', () => {
        changeRulesTableState();
        goToTablePage(2);

        cy.window().then((win) => {
          win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          cy.reload();

          expectRulesManagementTab();
          expectRulesTableState();
          expectTablePage(2);
        });
      });

      it('persists after corrupting the url param data', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL, { qs: { rulesTable: '(!invalid)' } });

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
      });

      it('DOES NOT persist after corrupting the session storage and url param data', () => {
        changeRulesTableState();
        goToTablePage(2);

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL, {
          qs: { rulesTable: '(!invalid)' },
          onBeforeLoad: (win) => {
            win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          },
        });

        expectRulesManagementTab();
        expectDefaultRulesTableState();
      });
    });
  });
});
