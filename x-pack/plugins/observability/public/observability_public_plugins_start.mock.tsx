/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';

const embeddableStartMock = {
  createStart() {
    return {
      getEmbeddableFactory: jest.fn(),
      getEmbeddableFactories: jest.fn(),
      EmbeddablePanel: jest.fn(),
      getStateTransfer: jest.fn(),
      getAttributeService: jest.fn(),
      telemetry: null,
      inject: jest.fn(),
      extract: jest.fn(),
      getAllMigrations: jest.fn(),
    };
  },
};

const triggersActionsUiStartMock = {
  createStart() {
    return {
      getAddAlertFlyout: jest.fn(() => (
        <div data-test-subj="add-alerts-flyout">mocked component</div>
      )),
      getAlertsSearchBar: jest.fn(() => (
        <div data-test-subj="alerts-search-bar">mocked component</div>
      )),
      getAlertsStateTable: jest.fn(() => (
        <div data-test-subj="alerts-state-table">mocked component</div>
      )),
      getEditAlertFlyout: jest.fn(() => (
        <div data-test-subj="edit-alert-flyout">mocked component</div>
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
    };
  },
};

export const observabilityPublicPluginsStartMock = {
  createStart() {
    return {
      cases: mockCasesContract(),
      embeddable: embeddableStartMock.createStart(),
      triggersActionsUi: triggersActionsUiStartMock.createStart(),
      data: data.createStart(),
      lens: null,
      discover: null,
    };
  },
};
