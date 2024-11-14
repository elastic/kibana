/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesService } from './types';

export const openAddToExistingCaseModalMock = jest.fn();
export const openAddToNewCaseFlyoutMock = jest.fn();

const uiMock: jest.MockedObject<CasesService['ui']> = {
  getCasesContext: jest.fn().mockImplementation(() => null),
};

const hooksMock: jest.MockedObject<CasesService['hooks']> = {
  useCasesAddToNewCaseFlyout: jest.fn().mockImplementation(() => ({
    open: openAddToNewCaseFlyoutMock,
  })),
  useCasesAddToExistingCaseModal: jest.fn().mockImplementation(() => ({
    open: openAddToExistingCaseModalMock,
  })),
};

const helpersMock: jest.MockedObject<CasesService['helpers']> = {
  canUseCases: jest.fn(),
  groupAlertsByRule: jest.fn(),
};

export const createCasesServiceMock = (): jest.MaybeMockedDeep<CasesService> => ({
  ui: uiMock,
  hooks: hooksMock,
  helpers: helpersMock,
});
