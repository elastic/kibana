/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';
import { savedObjectsServiceMock } from 'src/core/server/mocks';

import { xpackMocks } from '../../../../mocks';
import {
  AgentService,
  IngestManagerStartContract,
  ExternalCallback,
} from '../../../ingest_manager/server';
import { EndpointAppContextServiceStartContract } from './endpoint_app_context_services';
import { createDatasourceServiceMock } from '../../../ingest_manager/server/mocks';
import { getManifestManagerMock } from './services/artifacts/manifest_manager/manifest_manager.mock';

/**
 * Crates a mocked input contract for the `EndpointAppContextService#start()` method
 */
export const createMockEndpointAppContextServiceStartContract = (): jest.Mocked<
  EndpointAppContextServiceStartContract
> => {
  return {
    agentService: createMockAgentService(),
    savedObjectsStart: savedObjectsServiceMock.createStartContract(),
    manifestManager: getManifestManagerMock(),
    registerIngestCallback: jest.fn<
      ReturnType<IngestManagerStartContract['registerExternalCallback']>,
      Parameters<IngestManagerStartContract['registerExternalCallback']>
    >(),
  };
};

import { ExceptionListClient } from '../../../lists/server';

import { ArtifactClient, ManifestManager } from './services';

/**
 * Creates a mock AgentService
 */
export const createMockAgentService = (): jest.Mocked<AgentService> => {
  return {
    getAgentStatusById: jest.fn(),
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
    datasourceService: createDatasourceServiceMock(),
  };
};

export function createRouteHandlerContext(
  dataClient: jest.Mocked<IScopedClusterClient>,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>
) {
  const context = xpackMocks.createRequestHandlerContext();
  context.core.elasticsearch.legacy.client = dataClient;
  context.core.savedObjects.client = savedObjectsClient;
  return context;
}
