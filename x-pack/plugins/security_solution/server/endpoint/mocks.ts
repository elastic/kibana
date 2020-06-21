/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient, SavedObjectsClientContract } from 'kibana/server';

import { xpackMocks } from '../../../../mocks';
import { AgentService, IngestManagerStartContract } from '../../../ingest_manager/server';

import { ExceptionListClient } from '../../../lists/server';

import { ArtifactService, ManifestService } from './services';

/**
 * Creates a mock AgentService
 */
export const createMockAgentService = (): jest.Mocked<AgentService> => {
  return {
    getAgentStatusById: jest.fn(),
  };
};

/**
 * Creates a mock ArtifactService
 */
export const createMockArtifactService = (): jest.Mocked<ArtifactService> => {
  return {
    // TODO
  };
};

/**
 * Creates a mock ManifestService
 */
export const createMockManifestService = (): jest.Mocked<ManifestService> => {
  return {
    // TODO
  };
};

/**
 * Creates a mock ExceptionListClient
 */
export const createMockExceptionListClient = (): jest.Mocked<ExceptionListClient> => {
  return {
    // TODO
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
