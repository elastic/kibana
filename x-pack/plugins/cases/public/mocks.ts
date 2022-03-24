/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from './mocks/mock_cases_context';
import { CasesUiStart } from './types';

const apiMock: jest.Mocked<CasesUiStart['api']> = {
  getRelatedCases: jest.fn(),
};

const uiMock: jest.Mocked<CasesUiStart['ui']> = {
  getCases: jest.fn(),
  getCasesContext: jest.fn().mockImplementation(() => mockCasesContext),
  getAllCasesSelectorModal: jest.fn(),
  getCreateCaseFlyout: jest.fn(),
  getRecentCases: jest.fn(),
};

const hooksMock: jest.Mocked<CasesUiStart['hooks']> = {
  getUseCasesAddToNewCaseFlyout: jest.fn(),
  getUseCasesAddToExistingCaseModal: jest.fn(),
};

const helpersMock: jest.Mocked<CasesUiStart['helpers']> = {
  canUseCases: jest.fn(),
  getRuleIdFromEvent: jest.fn(),
};

export interface CaseUiClientMock {
  api: jest.Mocked<CasesUiStart['api']>;
  ui: jest.Mocked<CasesUiStart['ui']>;
  hooks: jest.Mocked<CasesUiStart['hooks']>;
  helpers: jest.Mocked<CasesUiStart['helpers']>;
}

export const mockCasesContract = (): CaseUiClientMock => ({
  api: apiMock,
  ui: uiMock,
  hooks: hooksMock,
  helpers: helpersMock,
});

export const casesPluginMock = {
  createStartContract: mockCasesContract,
};
