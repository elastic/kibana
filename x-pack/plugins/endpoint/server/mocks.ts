/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IScopedClusterClient,
  RequestHandlerContext,
  SavedObjectsClientContract,
} from 'kibana/server';
import { AgentService, IngestManagerStartContract } from '../../ingest_manager/server';
import { IndexPatternRetriever } from './alerts/index_pattern';

/**
 * Creates a mock IndexPatternRetriever for use in tests.
 *
 * @param indexPattern a string index pattern to return when any of the mock's public methods are called.
 * @returns the same string passed in via `indexPattern`
 */
export const createMockIndexPatternRetriever = (indexPattern: string): IndexPatternRetriever => {
  const mockGetFunc = jest.fn().mockResolvedValue(indexPattern);
  return {
    getIndexPattern: mockGetFunc,
    getEventIndexPattern: mockGetFunc,
    getMetadataIndexPattern: mockGetFunc,
    getPolicyResponseIndexPattern: mockGetFunc,
  };
};

export const MetadataIndexPattern = 'metrics-endpoint-*';

/**
 * Creates a mock IndexPatternRetriever for use in tests that returns `metrics-endpoint-*`
 */
export const createMockMetadataIndexPatternRetriever = () => {
  return createMockIndexPatternRetriever(MetadataIndexPattern);
};

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
  };
};

export function createRouteHandlerContext(
  dataClient: jest.Mocked<IScopedClusterClient>,
  savedObjectsClient: jest.Mocked<SavedObjectsClientContract>
) {
  return ({
    core: {
      elasticsearch: {
        dataClient,
      },
      savedObjects: {
        client: savedObjectsClient,
      },
    },
    /**
     * Using unknown here because the object defined is not a full `RequestHandlerContext`. We don't
     * need all of the fields required to run the tests, but the `routeHandler` function requires a
     * `RequestHandlerContext`.
     */
  } as unknown) as RequestHandlerContext;
}
