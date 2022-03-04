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

export const createRuleDataClientMock = (
  indexName: string = '.alerts-security.alerts'
): RuleDataClientMock => {
  const bulk = jest.fn();
  const search = jest.fn();
  const getDynamicIndexPattern = jest.fn();

  return {
    indexName,
    kibanaVersion: '7.16.0',
    isWriteEnabled: jest.fn(() => true),
    indexNameWithNamespace: jest.fn((namespace: string) => indexName + namespace),

    // @ts-ignore 4.3.5 upgrade
    getReader: jest.fn((_options?: { namespace?: string }) => ({
      search,
      getDynamicIndexPattern,
    })),

    getWriter: jest.fn(() => ({
      bulk,
    })),
  };
};
