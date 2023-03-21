/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { RuleTypeRegistry } from './rule_type_registry';

type Schema = PublicMethodsOf<RuleTypeRegistry>;

const createRuleTypeRegistryMock = () => {
  const mocked: jest.Mocked<Schema> = {
    has: jest.fn(),
    register: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    getAllTypes: jest.fn(),
    ensureRuleTypeEnabled: jest.fn(),
  };
  return mocked;
};

export const ruleTypeRegistryMock = {
  create: createRuleTypeRegistryMock,
};
