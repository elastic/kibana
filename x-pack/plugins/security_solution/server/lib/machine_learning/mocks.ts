/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlPluginSetup } from '../../../../ml/server';
import { elasticsearchServiceMock } from '../../../../../../src/core/server/mocks';

const createMockClient = () => elasticsearchServiceMock.createLegacyClusterClient();
const createMockMlSystemProvider = () =>
  jest.fn(() => ({
    mlCapabilities: jest.fn(),
  }));

export const mlServicesMock = {
  create: () =>
    (({
      modulesProvider: jest.fn(),
      jobServiceProvider: jest.fn(),
      anomalyDetectorsProvider: jest.fn(),
      mlSystemProvider: createMockMlSystemProvider(),
      mlClient: createMockClient(),
    } as unknown) as jest.Mocked<MlPluginSetup>),
};

const mockValidateRuleType = jest.fn().mockResolvedValue({ valid: true, message: undefined });
const createBuildMlAuthzMock = () =>
  jest.fn().mockReturnValue({ validateRuleType: mockValidateRuleType });

export const mlAuthzMock = {
  create: () => ({
    buildMlAuthz: createBuildMlAuthzMock(),
  }),
};
