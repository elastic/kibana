/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const casesUiStartMock = {
  createStart() {
    return {
      getCases: jest.fn(),
      getAllCasesSelectorModal: jest.fn(),
      getCreateCaseFlyout: jest.fn(),
      getRecentCases: jest.fn(),
    };
  },
};

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

export const observabilityPublicPluginsStartMock = {
  createStart() {
    return {
      cases: casesUiStartMock.createStart(),
      embeddable: embeddableStartMock.createStart(),
      triggersActionsUi: null,
      data: null,
      lens: null,
      discover: null,
    };
  },
};
