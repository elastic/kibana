/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Registry } from '@kbn/wc-framework-types-server';
import { SimpleRegistry } from '../../utils';

export type MockRegistry = jest.Mocked<Registry<any>>;

export const createMockRegistry = (): MockRegistry => {
  const registry = new SimpleRegistry<any>();

  jest.spyOn(registry, 'has');
  jest.spyOn(registry, 'get');
  jest.spyOn(registry, 'getAll');
  jest.spyOn(registry, 'getAllKeys');
  jest.spyOn(registry, 'register');

  return registry as unknown as MockRegistry;
};
