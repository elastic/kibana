/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCasesContext } from './mocks/mock_cases_context';
import { CasesUiStart } from './types';

export const mockCasesContract = (): jest.Mocked<CasesUiStart> => ({
  canUseCases: jest.fn(),
  getCases: jest.fn(),
  getCasesContext: jest.fn().mockImplementation(() => mockCasesContext),
  getAllCasesSelectorModal: jest.fn(),
  getAllCasesSelectorModalNoProvider: jest.fn(),
  getCreateCaseFlyout: jest.fn(),
  getRecentCases: jest.fn(),
  getCreateCaseFlyoutNoProvider: jest.fn(),
  hooks: {
    getUseCasesAddToNewCaseFlyout: jest.fn(),
    getUseCasesAddToExistingCaseModal: jest.fn(),
  },
  helpers: {
    getRuleIdFromEvent: jest.fn(),
  },
});

export const casesPluginMock = {
  createStartContract: mockCasesContract,
};
