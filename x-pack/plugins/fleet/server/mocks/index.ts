/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { of } from 'rxjs';

import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { dataPluginMock } from '@kbn/data-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';

import type { PackagePolicyClient } from '../services/package_policy_service';
import type { AgentPolicyServiceInterface } from '../services';
import type { FleetAppContext } from '../plugin';
import { createMockTelemetryEventsSender } from '../telemetry/__mocks__';
import type { FleetConfigType } from '../../common/types';
import type { ExperimentalFeatures } from '../../common/experimental_features';
import { createFleetAuthzMock } from '../../common/mocks';
import { agentServiceMock } from '../services/agents/agent_service.mock';
import type { FleetRequestHandlerContext } from '../types';
import { packageServiceMock } from '../services/epm/package_service.mock';

// Export all mocks from artifacts
export * from '../services/artifacts/mocks';

export interface MockedFleetAppContext extends FleetAppContext {
  elasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  data: ReturnType<typeof dataPluginMock.createStartContract>;
  encryptedSavedObjectsStart?: ReturnType<typeof encryptedSavedObjectsMock.createStart>;
  savedObjects: ReturnType<typeof savedObjectsServiceMock.createStartContract>;
  securitySetup: ReturnType<typeof securityMock.createSetup>;
  securityStart: ReturnType<typeof securityMock.createStart>;
  logger: ReturnType<ReturnType<typeof loggingSystemMock.create>['get']>;
}

export const createAppContextStartContractMock = (
  configOverrides: Partial<FleetConfigType> = {}
): MockedFleetAppContext => {
  const config = {
    agents: { enabled: true, elasticsearch: {} },
    enabled: true,
    agentIdVerificationEnabled: true,
    ...configOverrides,
  };

  const config$ = of(config);

  return {
    elasticsearch: elasticsearchServiceMock.createStart(),
    data: dataPluginMock.createStartContract(),
    encryptedSavedObjectsStart: encryptedSavedObjectsMock.createStart(),
    encryptedSavedObjectsSetup: encryptedSavedObjectsMock.createSetup({ canEncrypt: true }),
    savedObjects: savedObjectsServiceMock.createStartContract(),
    securitySetup: securityMock.createSetup(),
    securityStart: securityMock.createStart(),
    logger: loggingSystemMock.create().get(),
    experimentalFeatures: {} as ExperimentalFeatures,
    isProductionMode: true,
    configInitialValue: {
      agents: { enabled: true, elasticsearch: {} },
      enabled: true,
      agentIdVerificationEnabled: true,
    },
    config$,
    kibanaVersion: '8.99.0', // Fake version :)
    kibanaBranch: 'main',
    telemetryEventsSender: createMockTelemetryEventsSender(),
    bulkActionsResolver: {} as any,
    messageSigningService: createMessageSigningServiceMock(),
  };
};

export const createFleetRequestHandlerContextMock = (): jest.Mocked<
  Awaited<FleetRequestHandlerContext['fleet']>
> => {
  return {
    authz: createFleetAuthzMock(),
    agentClient: {
      asCurrentUser: agentServiceMock.createClient(),
      asInternalUser: agentServiceMock.createClient(),
    },
    packagePolicyService: {
      asCurrentUser: createPackagePolicyServiceMock(),
      asInternalUser: createPackagePolicyServiceMock(),
    },
    internalSoClient: savedObjectsClientMock.create(),
    spaceId: 'default',
    limitedToPackages: undefined,
  };
};

function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
    fleet: createFleetRequestHandlerContextMock(),
  };
}

export const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};

export const createPackagePolicyServiceMock = (): jest.Mocked<PackagePolicyClient> => {
  return {
    buildPackagePolicyFromPackage: jest.fn(),
    bulkCreate: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    getByIDs: jest.fn(),
    list: jest.fn(),
    listIds: jest.fn(),
    update: jest.fn(),
    bulkUpdate: jest.fn(),
    runExternalCallbacks: jest.fn(),
    runDeleteExternalCallbacks: jest.fn(),
    runPostDeleteExternalCallbacks: jest.fn(),
    upgrade: jest.fn(),
    getUpgradeDryRunDiff: jest.fn(),
    getUpgradePackagePolicyInfo: jest.fn(),
    enrichPolicyWithDefaultsFromPackage: jest.fn(),
    findAllForAgentPolicy: jest.fn(),
  };
};

/**
 * Create mock AgentPolicyService
 */

export const createMockAgentPolicyService = (): jest.Mocked<AgentPolicyServiceInterface> => {
  return {
    get: jest.fn(),
    list: jest.fn(),
    getFullAgentPolicy: jest.fn(),
    getByIds: jest.fn(),
  };
};

/**
 * Creates a mock AgentService
 */
export const createMockAgentService = () => agentServiceMock.create();

/**
 * Creates a mock AgentClient
 */
export const createMockAgentClient = () => agentServiceMock.createClient();

/**
 * Creates a mock PackageService
 */
export const createMockPackageService = () => packageServiceMock.create();

export function createMessageSigningServiceMock() {
  return {
    isEncryptionAvailable: true,
    generateKeyPair: jest.fn(),
    sign: jest.fn(),
    getPublicKey: jest.fn(),
  };
}
