/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
      getAddAlertFlyout: jest.fn(),
      getRuleStatusDropdown: jest.fn(),
      getRuleTagBadge: jest.fn(),
      getRuleStatusFilter: jest.fn(),
      getRuleTagFilter: jest.fn(),
      getRulesList: jest.fn(),
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
