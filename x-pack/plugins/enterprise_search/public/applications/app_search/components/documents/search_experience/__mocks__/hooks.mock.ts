/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../hooks', () => ({
  useSearchContextActions: jest.fn(() => ({})),
  useSearchContextState: jest.fn(() => ({})),
}));

import { useSearchContextState, useSearchContextActions } from '../hooks';

export const setMockSearchContextState = (values: object) => {
  (useSearchContextState as jest.Mock).mockImplementation(() => values);
};
export const setMockSearchContextActions = (actions: object) => {
  (useSearchContextActions as jest.Mock).mockImplementation(() => actions);
};
