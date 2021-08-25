/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { RuleDataPluginService } from './rule_data_plugin_service';

type Schema = PublicMethodsOf<RuleDataPluginService>;

const createRuleDataPluginService = () => {
  const mocked: jest.Mocked<Schema> = {
    getRegisteredIndexInfo: jest.fn(),
    getResourcePrefix: jest.fn(),
    getResourceName: jest.fn(),
    isWriteEnabled: jest.fn(),
    initializeService: jest.fn(),
    initializeIndex: jest.fn(),
  };
  return mocked;
};

export const ruleDataPluginServiceMock: {
  create: () => jest.Mocked<PublicMethodsOf<RuleDataPluginService>>;
} = {
  create: createRuleDataPluginService,
};
