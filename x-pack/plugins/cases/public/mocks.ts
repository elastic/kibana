/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from './mocks/mock_cases_context';
import type { CasesPublicStart } from './types';

const apiMock: jest.Mocked<CasesPublicStart['api']> = {
  getRelatedCases: jest.fn(),
  cases: {
    find: jest.fn(),
    getCasesMetrics: jest.fn(),
    getCasesStatus: jest.fn(),
    bulkGet: jest.fn(),
  },
};

const uiMock: jest.Mocked<CasesPublicStart['ui']> = {
  getCases: jest.fn(),
  getCasesContext: jest.fn().mockImplementation(() => mockCasesContext),
  getAllCasesSelectorModal: jest.fn(),
  getRecentCases: jest.fn(),
};

export const openAddToExistingCaseModalMock = jest.fn();
export const openAddToNewCaseFlyoutMock = jest.fn();

export interface CaseUiClientMock {
  api: jest.Mocked<CasesPublicStart['api']>;
  ui: jest.Mocked<CasesPublicStart['ui']>;
  helpers: jest.Mocked<CasesPublicStart['helpers']>;
}

export const mockCasesContract = (): CaseUiClientMock => ({
  api: apiMock,
  ui: uiMock,
  helpers: {
    canUseCases: jest.fn(),
  },
});

export const casesPluginMock = {
  createStartContract: mockCasesContract,
};
