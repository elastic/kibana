/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleDataClient, IRuleDataReader, IRuleDataWriter } from './types';

type MockInstances<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends (...args: infer TArgs) => infer TReturn
    ? jest.MockInstance<TReturn, TArgs> & T[K]
    : never;
};

type RuleDataClientMock = jest.Mocked<Omit<IRuleDataClient, 'getWriter' | 'getReader'>> & {
  getReader: (...args: Parameters<IRuleDataClient['getReader']>) => MockInstances<IRuleDataReader>;
  getWriter: (...args: Parameters<IRuleDataClient['getWriter']>) => MockInstances<IRuleDataWriter>;
};

export function createRuleDataClientMock(): RuleDataClientMock {
  const bulk = jest.fn();
  const search = jest.fn();
  const getDynamicIndexPattern = jest.fn();

  return {
    indexName: '.alerts-security.alerts',

    isWriteEnabled: jest.fn(() => true),

    getReader: jest.fn((_options?: { namespace?: string }) => ({
      getDynamicIndexPattern,
      search,
    })),

    getWriter: jest.fn(() => ({
      bulk,
    })),
  };
}
