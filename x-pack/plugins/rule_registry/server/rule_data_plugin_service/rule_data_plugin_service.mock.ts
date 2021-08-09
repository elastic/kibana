/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { RuleDataPluginService } from './';

type Schema = PublicMethodsOf<RuleDataPluginService>;

const createRuleDataPluginService = () => {
  const mocked: jest.Mocked<Schema> = {
    init: jest.fn(),
    isReady: jest.fn(),
    wait: jest.fn(),
    isWriteEnabled: jest.fn(),
    getFullAssetName: jest.fn(),
    createOrUpdateComponentTemplate: jest.fn(),
    createOrUpdateIndexTemplate: jest.fn(),
    createOrUpdateLifecyclePolicy: jest.fn(),
    getRuleDataClient: jest.fn(),
    updateIndexMappingsMatchingPattern: jest.fn(),
  };
  return mocked;
};

export const ruleDataPluginServiceMock: {
  create: () => jest.Mocked<PublicMethodsOf<RuleDataPluginService>>;
} = {
  create: createRuleDataPluginService,
};
