/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UseAppToasts } from './use_app_toasts';

const createAppToastsMock = (): jest.Mocked<UseAppToasts> => ({
  addError: jest.fn(),
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  api: {
    get$: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addDanger: jest.fn(),
    addError: jest.fn(),
    addInfo: jest.fn(),
  },
});

export const useAppToastsMock = {
  create: createAppToastsMock,
};
