/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from 'src/core/server/mocks';
import { coreMock } from '../../../../src/core/server/mocks';
import { licensingMock } from '../../../plugins/licensing/server/mocks';

import { FleetAppContext } from './plugin';
import { encryptedSavedObjectsMock } from '../../encrypted_saved_objects/server/mocks';
import { securityMock } from '../../security/server/mocks';
import { PackagePolicyServiceInterface } from './services/package_policy';
import { AgentPolicyServiceInterface, AgentService } from './services';

export const createAppContextStartContractMock = (): FleetAppContext => {
  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    encryptedSavedObjectsStart: encryptedSavedObjectsMock.createStart(),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    security: securityMock.createStart(),
    logger: loggingSystemMock.create().get(),
    isProductionMode: true,
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

export const createPackagePolicyServiceMock = () => {
  return {
    compilePackagePolicyInputs: jest.fn(),
    buildPackagePolicyFromPackage: jest.fn(),
    bulkCreate: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getByIDs: jest.fn(),
    list: jest.fn(),
    update: jest.fn(),
    runExternalCallbacks: jest.fn(),
  } as jest.Mocked<PackagePolicyServiceInterface>;
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
  };
};

/**
 * Creates a mock AgentService
 */
export const createMockAgentService = (): jest.Mocked<AgentService> => {
  return {
    getAgentStatusById: jest.fn(),
    authenticateAgentWithAccessToken: jest.fn(),
    getAgent: jest.fn(),
    listAgents: jest.fn(),
  };
};
