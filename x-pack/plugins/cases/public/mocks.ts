/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesUiStart } from './types';

const createStartContract = (): jest.Mocked<CasesUiStart> => ({
  getAllCases: jest.fn(),
  getAllCasesSelectorModal: jest.fn(),
  getCaseView: jest.fn(),
  getConfigureCases: jest.fn(),
  getCreateCase: jest.fn(),
  getRecentCases: jest.fn(),
});

export const casesPluginMock = {
  createStartContract,
};
