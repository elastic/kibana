/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleDataService } from './rule_data_plugin_service';

export const ruleDataServiceMock = {
  create: (): jest.Mocked<IRuleDataService> => ({
    getResourcePrefix: jest.fn(),
    getResourceName: jest.fn(),
    isWriteEnabled: jest.fn(),
    isWriterCacheEnabled: jest.fn(),
    initializeService: jest.fn(),
    initializeIndex: jest.fn(),
    findIndexByName: jest.fn(),
    findIndicesByFeature: jest.fn(),
  }),
};

export const RuleDataServiceMock = jest
  .fn<jest.Mocked<IRuleDataService>, []>()
  .mockImplementation(ruleDataServiceMock.create);
