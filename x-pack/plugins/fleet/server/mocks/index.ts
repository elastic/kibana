/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of } from 'rxjs';

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
  coreMock,
} from '../../../../../src/core/server/mocks';
import { dataPluginMock } from '../../../../../src/plugins/data/server/mocks';
import { licensingMock } from '../../../../plugins/licensing/server/mocks';
import { encryptedSavedObjectsMock } from '../../../encrypted_saved_objects/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import type { PackagePolicyServiceInterface } from '../services/package_policy';
import type { AgentPolicyServiceInterface, AgentService } from '../services';
import type { FleetAppContext } from '../plugin';

// Export all mocks from artifacts
export * from '../services/artifacts/mocks';

export interface MockedFleetAppContext extends FleetAppContext {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  data: ReturnType<typeof dataPluginMock.createStartContract>;
  encryptedSavedObjectsStart?: ReturnType<typeof encryptedSavedObjectsMock.createStart>;
  savedObjects: ReturnType<typeof savedObjectsServiceMock.createStartContract>;
  securitySetup?: ReturnType<typeof securityMock.createSetup>;
  securityStart?: ReturnType<typeof securityMock.createStart>;
  logger: ReturnType<ReturnType<typeof loggingSystemMock.create>['get']>;
}

export const createAppContextStartContractMock = (): MockedFleetAppContext => {
  const config = {
    agents: { enabled: true, elasticsearch: {} },
    enabled: true,
    agentIdVerificationEnabled: true,
  };

  const config$ = of(config);

  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    data: dataPluginMock.createStartContract(),
    encryptedSavedObjectsStart: encryptedSavedObjectsMock.createStart(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    securitySetup: securityMock.createSetup(),
    securityStart: securityMock.createStart(),
    logger: loggingSystemMock.create().get(),
    isProductionMode: true,
    configInitialValue: {
      agents: { enabled: true, elasticsearch: {} },
      enabled: true,
      agentIdVerificationEnabled: true,
    },
    config$,
    kibanaVersion: '8.0.0',
    kibanaBranch: 'master',
  };
};

function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
  };
}

export const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};

export const createPackagePolicyServiceMock = (): jest.Mocked<PackagePolicyServiceInterface> => {
  return {
    _compilePackagePolicyInputs: jest.fn(),
    buildPackagePolicyFromPackage: jest.fn(),
    bulkCreate: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getByIDs: jest.fn(),
    list: jest.fn(),
    listIds: jest.fn(),
    update: jest.fn(),
    runExternalCallbacks: jest.fn(),
    runDeleteExternalCallbacks: jest.fn(),
    upgrade: jest.fn(),
    getUpgradeDryRunDiff: jest.fn(),
    getUpgradePackagePolicyInfo: jest.fn(),
  };
};

/**
 * Create mock AgentPolicyService
 */

export const createMockAgentPolicyService = (): jest.Mocked<AgentPolicyServiceInterface> => {
  return {
    get: jest.fn(),
    list: jest.fn(),
    getDefaultAgentPolicyId: jest.fn(),
    getFullAgentPolicy: jest.fn(),
    getByIds: jest.fn(),
  };
};

/**
 * Creates a mock AgentService
 */
export const createMockAgentService = (): jest.Mocked<AgentService> => {
  return {
    getAgentStatusById: jest.fn(),
    getAgentStatusForAgentPolicy: jest.fn(),
    authenticateAgentWithAccessToken: jest.fn(),
    getAgent: jest.fn(),
    listAgents: jest.fn(),
  };
};
