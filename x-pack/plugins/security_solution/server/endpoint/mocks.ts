/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILegacyScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { loggingSystemMock, savedObjectsServiceMock } from 'src/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { loggerMock } from 'src/core/server/logging/logger.mock';
import { xpackMocks } from '../../../../mocks';
import {
  AgentService,
  IngestManagerStartContract,
  ExternalCallback,
} from '../../../ingest_manager/server';
import { createPackageConfigServiceMock } from '../../../ingest_manager/server/mocks';
import { ConfigType } from '../config';
import { createMockConfig } from '../lib/detection_engine/routes/__mocks__';
import {
  EndpointAppContextService,
  EndpointAppContextServiceStartContract,
} from './endpoint_app_context_services';
import {
  ManifestManagerMock,
  getManifestManagerMock,
} from './services/artifacts/manifest_manager/manifest_manager.mock';
import { EndpointAppContext } from './types';

/**
 * Creates a mocked EndpointAppContext.
 */
export const createMockEndpointAppContext = (
  mockManifestManager?: ManifestManagerMock
): EndpointAppContext => {
  return {
    logFactory: loggingSystemMock.create(),
    // @ts-ignore
    config: createMockConfig() as ConfigType,
    service: createMockEndpointAppContextService(mockManifestManager),
  };
};

/**
 * Creates a mocked EndpointAppContextService
 */
export const createMockEndpointAppContextService = (
  mockManifestManager?: ManifestManagerMock
): jest.Mocked<EndpointAppContextService> => {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    getAgentService: jest.fn(),
    // @ts-ignore
    getManifestManager: mockManifestManager ?? jest.fn(),
    getScopedSavedObjectsClient: jest.fn(),
  };
};

/**
 * Creates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract = (): jest.Mocked<
  EndpointAppContextServiceStartContract
> => {
  return {
    agentService: createMockAgentService(),
    logger: loggerMock.create(),
    savedObjectsStart: savedObjectsServiceMock.createStartContract(),
    manifestManager: getManifestManagerMock(),
    registerIngestCallback: jest.fn<
      ReturnType<IngestManagerStartContract['registerExternalCallback']>,
      Parameters<IngestManagerStartContract['registerExternalCallback']>
    >(),
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

/**
 * Creates a mock IndexPatternService for use in tests that need to interact with the Ingest Manager's
 * ESIndexPatternService.
 *
 * @param indexPattern a string index pattern to return when called by a test
 * @returns the same value as `indexPattern` parameter
 */
export const createMockIngestManagerStartContract = (
  indexPattern: string
): IngestManagerStartContract => {
  return {
    esIndexPatternService: {
      getESIndexPattern: jest.fn().mockResolvedValue(indexPattern),
    },
    agentService: createMockAgentService(),
    registerExternalCallback: jest.fn((...args: ExternalCallback) => {}),
    packageConfigService: createPackageConfigServiceMock(),
  };
};

export function createRouteHandlerContext(
  dataClient: jest.Mocked<ILegacyScopedClusterClient>,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>
) {
  const context = xpackMocks.createRequestHandlerContext();
  context.core.elasticsearch.legacy.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;
  return context;
}
