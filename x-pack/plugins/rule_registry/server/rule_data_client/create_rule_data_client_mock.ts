/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PublicContract } from '@kbn/utility-types';
import type { RuleDataClient } from '.';
import { RuleDataReader, RuleDataWriter } from './types';

type MockInstances<T extends Record<string, any>> = {
  [K in keyof T]: T[K] extends (...args: infer TArgs) => infer TReturn
    ? jest.MockInstance<TReturn, TArgs> & T[K]
    : never;
};

type RuleDataClientMock = jest.Mocked<
  Omit<PublicContract<RuleDataClient>, 'getWriter' | 'getReader'>
> & {
  getWriter: (...args: Parameters<RuleDataClient['getWriter']>) => MockInstances<RuleDataWriter>;
  getReader: (...args: Parameters<RuleDataClient['getReader']>) => MockInstances<RuleDataReader>;
};

export function createRuleDataClientMock(): RuleDataClientMock {
  const bulk = jest.fn();
  const search = jest.fn();
  const getDynamicIndexPattern = jest.fn();

  return {
    createWriteTargetIfNeeded: jest.fn(({}) => Promise.resolve()),
    getReader: jest.fn((_options?: { namespace?: string }) => ({
      getDynamicIndexPattern,
      search,
    })),
    getWriter: jest.fn(() => ({
      bulk,
    })),
    isWriteEnabled: jest.fn(() => true),
  };
}
