/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useVariation } from './utils';

export const useVariationMock: jest.MockedFunction<typeof useVariation> = jest.fn();

jest.doMock('./utils', () => {
  const actualUtils = jest.requireActual('./utils');
  return {
    ...actualUtils,
    useVariation: useVariationMock,
  };
});
