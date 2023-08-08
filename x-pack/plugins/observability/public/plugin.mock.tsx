/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

const triggersActionsUiStartMock = {
  createStart() {
    return {
      getAlertsSearchBar: jest.fn(() => (
        <div data-test-subj="alerts-search-bar">mocked component</div>
      )),
      getAlertsStateTable: jest.fn(() => (
        <div data-test-subj="alerts-state-table">mocked component</div>
      )),
      getAddRuleFlyout: jest.fn(() => <div data-test-subj="add-rule-flyout">mocked component</div>),
      getEditRuleFlyout: jest.fn(() => (
        <div data-test-subj="edit-rule-flyout">mocked component</div>
      )),
      getRuleAlertsSummary: jest.fn(() => (
        <div data-test-subj="rule-alerts-summary">mocked component</div>
      )),
      getRuleDefinition: jest.fn(() => (
        <div data-test-subj="rule-definition">mocked component</div>
      )),
      getRuleEventLogList: jest.fn(() => (
        <div data-test-subj="rule-event-log-list">mocked component</div>
      )),
      getRuleStatusDropdown: jest.fn(() => (
        <div data-test-subj="rule-status-dropdown">mocked component</div>
      )),
      getRuleStatusPanel: jest.fn(() => (
        <div data-test-subj="rule-status-panel">mocked component</div>
      )),
      getRuleTagBadge: jest.fn(() => <div data-test-subj="rule-tag-badge">mocked component</div>),
      getRuleStatusFilter: jest.fn(() => (
        <div data-test-subj="rule-status-filter">mocked component</div>
      )),
      getRuleTagFilter: jest.fn(() => <div data-test-subj="rule-tag-filter">mocked component</div>),
      getRulesList: jest.fn(() => <div data-test-subj="rules-list">mocked component</div>),
      getRulesSettingsLink: jest.fn(() => (
        <div data-test-subj="rules-settings-link">mocked component</div>
      )),
      ruleTypeRegistry: {
        has: jest.fn(),
        register: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
      actionTypeRegistry: {
        has: jest.fn((x) => true),
        register: jest.fn(),
        get: jest.fn(),
        list: jest.fn(),
      },
    };
  },
};

const data = {
  createStart() {
    return {
      dataViews: {
        create: jest.fn(),
      },
      query: {
        timefilter: {
          timefilter: jest.fn(),
        },
      },
      search: {
        searchSource: {
          create: jest.fn(),
        },
      },
    };
  },
};

const dataViewEditor = {
  createStart() {
    return {
      userPermissions: {
        editDataView: jest.fn(),
      },
    };
  },
};

const dataViews = {
  createStart() {
    return {
      getIds: jest.fn().mockImplementation(() => []),
      get: jest.fn(),
      create: jest.fn().mockImplementation(() => ({
        fields: {
          getByName: jest.fn(),
        },
      })),
    };
  },
};

export const observabilityPublicPluginsStartMock = {
  createStart() {
    return {
      cases: mockCasesContract(),
      triggersActionsUi: triggersActionsUiStartMock.createStart(),
      data: data.createStart(),
      dataViews: dataViews.createStart(),
      dataViewEditor: dataViewEditor.createStart(),
      lens: null,
      discover: null,
    };
  },
};
