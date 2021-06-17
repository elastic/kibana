/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Assign } from '@kbn/utility-types';
import type { RuleDataClient } from '.';
import { RuleDataReader, RuleDataWriter } from './types';

type MockInstances<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends (...args: infer TArgs) => infer TReturn
    ? jest.MockInstance<TReturn, TArgs>
    : never;
};

export function createRuleDataClientMock() {
  const bulk = jest.fn();
  const search = jest.fn();
  const getDynamicIndexPattern = jest.fn();

  return ({
    createOrUpdateWriteTarget: jest.fn(({ namespace }) => Promise.resolve()),
    getReader: jest.fn(() => ({
      getDynamicIndexPattern,
      search,
    })),
    getWriter: jest.fn(() => ({
      bulk,
    })),
  } as unknown) as Assign<
    RuleDataClient & Omit<MockInstances<RuleDataClient>, 'options' | 'getClusterClient'>,
    {
      getWriter: (
        ...args: Parameters<RuleDataClient['getWriter']>
      ) => MockInstances<RuleDataWriter>;
      getReader: (
        ...args: Parameters<RuleDataClient['getReader']>
      ) => MockInstances<RuleDataReader>;
    }
  >;
}
