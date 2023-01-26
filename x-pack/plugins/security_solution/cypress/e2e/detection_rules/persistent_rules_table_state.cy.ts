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
  expectTags,
  expectCustomRules,
  expectRulesManagementTab,
  expectRulesMonitoringTab,
} from '../../tasks/alerts_detection_rules';
import {
  RULES_MANAGEMENT_TABLE,
  RULES_MONITORING_TABLE,
} from '../../screens/alerts_detection_rules';
import { createCustomRule } from '../../tasks/api_calls/rules';
import {
  expectRowsPerPage,
  expectTablePage,
  expectTableSorting,
  goToTablePage,
  setRowsPerPageTo,
  sortByTableColumn,
} from '../../tasks/table_pagination';

function createRule(id: string, name: string, tags?: string[]): void {
  const rule = getNewRule();

  rule.name = name;
  rule.tags = tags;

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
}

function visitWithState(urlTableState: Record<string, unknown>): void {
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
  sortByTableColumn('Rule', 'asc');
  setRowsPerPageTo(5);
}

function expectRulesTableState(): void {
  expectFilterSearchTerm('rule');
  expectTags(['tag-b']);
  expectCustomRules();
  expectTableSorting('Rule', 'asc');
  expectRowsPerPage(5);
}

function expectDefaultRulesTableState(): void {
  expectFilterSearchTerm('');
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

function expectMonitoringTableRules(ruleNames: string[]): void {
  expectNumberOfRules(RULES_MONITORING_TABLE, ruleNames.length);

  for (const ruleName of ruleNames) {
    expectToContainRule(RULES_MONITORING_TABLE, ruleName);
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

    it('prefers url state over storage state', () => {
      setStorageState({
        searchTerm: 'test',
        tags: ['tag-c'],
        source: 'prebuilt',
        field: 'severity',
        order: 'desc',
        perPage: 10,
      });

      visitWithState({
        searchTerm: 'rule',
        tags: ['tag-b'],
        source: 'custom',
        field: 'name',
        order: 'asc',
        perPage: 5,
        page: 2,
      });

      expectRulesManagementTab();
      expectRulesTableState();
      expectTablePage(2);
      expectManagementTableRules(['rule 6']);
    });

    describe('and on the rules management tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        changeRulesTableState();
        goToTablePage(2);
      });

      it('persists after reloading the page', () => {
        cy.reload();

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
        expectManagementTableRules(['rule 6']);
      });

      it('persists after navigating back from a rule details page', () => {
        expectManagementTableRules(['rule 6']);

        goToRuleDetails();
        cy.go('back');

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
        expectManagementTableRules(['rule 6']);
      });

      it('persists after navigating to another page inside Security Solution', () => {
        expectManagementTableRules(['rule 6']);

        visit(DASHBOARDS_URL);
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });

      it('persists after navigating to another page outside Security Solution', () => {
        expectManagementTableRules(['rule 6']);

        visit(KIBANA_HOME);
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });
    });

    describe('and on the rules monitoring tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);

        changeRulesTableState();
        goToTablePage(2);
      });

      it('persists after reloading the page', () => {
        cy.reload();

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(2);
        expectMonitoringTableRules(['rule 6']);
      });

      it('persists after navigating back from a rule details page', () => {
        expectMonitoringTableRules(['rule 6']);

        goToRuleDetails();
        cy.go('back');

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(2);
        expectMonitoringTableRules(['rule 6']);
      });

      it('persists after navigating to another page inside Security Solution', () => {
        expectMonitoringTableRules(['rule 6']);

        visit(DASHBOARDS_URL);
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(1);
        expectMonitoringTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });

      it('persists after navigating to another page outside Security Solution', () => {
        expectMonitoringTableRules(['rule 6']);

        visit(KIBANA_HOME);
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(1);
        expectMonitoringTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });
    });
  });

  describe('upon version upgrade', async () => {
    describe('and having state in the url', () => {
      it('ignores unsupported state key', () => {
        visitWithState({
          someKey: 10,
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          field: 'name',
          order: 'asc',
          perPage: 5,
          page: 2,
        });

        expectRulesTableState();
        expectTablePage(2);
        expectManagementTableRules(['rule 6']);
      });

      it('ignores negative page number (uses default pagination settings)', () => {
        visitWithState({
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          field: 'name',
          order: 'asc',
          perPage: 5,
          page: -1,
        });

        expectFilterSearchTerm('rule');
        expectTags(['tag-b']);
        expectCustomRules();
        expectTableSorting('Rule', 'asc');
        expectRowsPerPage(20);
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5', 'rule 6']);
      });

      it('ignores negative per page (uses default pagination settings)', () => {
        visitWithState({
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          field: 'name',
          order: 'asc',
          perPage: -1,
          page: 2,
        });

        expectFilterSearchTerm('rule');
        expectTags(['tag-b']);
        expectCustomRules();
        expectTableSorting('Rule', 'asc');
        expectRowsPerPage(20);
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5', 'rule 6']);
      });

      it('ignores invalid prebuilt vs custom filter value (uses default filter settings)', () => {
        visitWithState({
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'invalid',
          field: 'name',
          order: 'asc',
          perPage: 5,
          page: 2,
        });

        expectFilterSearchTerm('');
        expectTableSorting('Rule', 'asc');
        expectRowsPerPage(5);
        expectTablePage(2);
        expectManagementTableRules(['rule 6', 'test 1']);
      });
    });

    describe('and having state in the session storage', () => {
      it('ignores unsupported state key', () => {
        setStorageState({
          someKey: 10,
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          field: 'name',
          order: 'asc',
          perPage: 5,
        });

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesTableState();
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });

      it('ignores negative per page (uses default pagination settings)', () => {
        setStorageState({
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'custom',
          field: 'name',
          order: 'asc',
          perPage: -1,
        });

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectFilterSearchTerm('rule');
        expectTags(['tag-b']);
        expectCustomRules();
        expectTableSorting('Rule', 'asc');
        expectRowsPerPage(20);
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5', 'rule 6']);
      });

      it('ignores invalid prebuilt vs custom filter value (uses default filter settings)', () => {
        setStorageState({
          searchTerm: 'rule',
          tags: ['tag-b'],
          source: 'invalid',
          field: 'name',
          order: 'asc',
          perPage: 5,
        });

        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectFilterSearchTerm('');
        expectTableSorting('Rule', 'asc');
        expectRowsPerPage(5);
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });
    });
  });

  describe('when persisted state is partially unavailable', () => {
    describe('and on the rules management tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        changeRulesTableState();
        goToTablePage(2);
      });

      it('persists after clearing the session storage', () => {
        cy.window().then((win) => {
          win.sessionStorage.clear();
        });
        cy.reload();

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(2);
        expectManagementTableRules(['rule 6']);
      });

      it('persists after clearing the url state', () => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });
    });

    describe('and on the rules monitoring tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);

        changeRulesTableState();
        goToTablePage(2);
      });

      it('persists after clearing the session storage', () => {
        cy.clearAllSessionStorage();
        cy.reload();

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(2);
        expectMonitoringTableRules(['rule 6']);
      });

      it('persists after clearing the url state', () => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(1);
        expectMonitoringTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });
    });
  });

  describe('when corrupted', () => {
    describe('and on the rules management tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

        changeRulesTableState();
        goToTablePage(2);
      });

      it('persists after corrupting the session storage data', () => {
        cy.window().then((win) => {
          win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          cy.reload();

          expectRulesManagementTab();
          expectRulesTableState();
          expectTablePage(2);
          expectManagementTableRules(['rule 6']);
        });
      });

      it('persists after corrupting the url param data', () => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL, { qs: { rulesTable: '(!invalid)' } });

        expectRulesManagementTab();
        expectRulesTableState();
        expectTablePage(1);
        expectManagementTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });

      it('DOES NOT persist after corrupting the session storage and url param data', () => {
        visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL, {
          qs: { rulesTable: '(!invalid)' },
          onBeforeLoad: (win) => {
            win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          },
        });

        expectRulesManagementTab();
        expectDefaultRulesTableState();
        expectManagementTableRules([
          'test 1',
          'rule 1',
          'rule 2',
          'rule 3',
          'rule 4',
          'rule 5',
          'rule 6',
        ]);
      });
    });

    describe('and on the rules monitoring tab', () => {
      beforeEach(() => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL);

        changeRulesTableState();
        goToTablePage(2);
      });

      it('persists after corrupting the session storage data', () => {
        cy.window().then((win) => {
          win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          cy.reload();

          expectRulesMonitoringTab();
          expectRulesTableState();
          expectTablePage(2);
          expectMonitoringTableRules(['rule 6']);
        });
      });

      it('persists after corrupting the url param data', () => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL, { qs: { rulesTable: '(!invalid)' } });

        expectRulesMonitoringTab();
        expectRulesTableState();
        expectTablePage(1);
        expectMonitoringTableRules(['rule 1', 'rule 2', 'rule 3', 'rule 4', 'rule 5']);
      });

      it('DOES NOT persist after corrupting the session storage and url param data', () => {
        visit(SECURITY_DETECTIONS_RULES_MONITORING_URL, {
          qs: { rulesTable: '(!invalid)' },
          onBeforeLoad: (win) => {
            win.sessionStorage.setItem('securitySolution.rulesTable', '!invalid');
          },
        });

        expectRulesMonitoringTab();
        expectDefaultRulesTableState();
        expectMonitoringTableRules([
          'test 1',
          'rule 1',
          'rule 2',
          'rule 3',
          'rule 4',
          'rule 5',
          'rule 6',
        ]);
      });
    });
  });

  describe('in a new browser tab', () => {
    beforeEach(() => {
      visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL);

      changeRulesTableState();
      goToTablePage(2);
    });

    it('has a fresh state', () => {
      visit(SECURITY_DETECTIONS_RULES_MANAGEMENT_URL, {
        onBeforeLoad: (win) => {
          win.sessionStorage.clear();
        },
      });

      expectRulesManagementTab();
      expectDefaultRulesTableState();
      expectManagementTableRules([
        'test 1',
        'rule 1',
        'rule 2',
        'rule 3',
        'rule 4',
        'rule 5',
        'rule 6',
      ]);
    });
  });
});
