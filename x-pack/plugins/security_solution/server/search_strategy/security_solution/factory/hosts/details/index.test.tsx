/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as buildQuery from './query.host_details.dsl';
import { hostDetails } from '.';
import {
  mockOptions,
  mockSearchStrategyResponse,
  formattedSearchStrategyResponse,
} from './__mocks__';
import { IScopedClusterClient, KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import { EndpointAppContext } from '../../../../../endpoint/types';
import { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { allowedExperimentalValues } from '../../../../../../common/experimental_features';

const mockDeps = {
  esClient: {} as IScopedClusterClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  endpointContext: {
    logFactory: {
      get: jest.fn().mockReturnValue({
        warn: jest.fn(),
      }),
    },
    config: jest.fn().mockResolvedValue({}),
    experimentalFeatures: {
      ...allowedExperimentalValues,
    },
    service: {} as EndpointAppContextService,
  } as EndpointAppContext,
  request: {} as KibanaRequest,
};

describe('hostDetails search strategy', () => {
  const buildHostDetailsQuery = jest.spyOn(buildQuery, 'buildHostDetailsQuery');

  afterEach(() => {
    buildHostDetailsQuery.mockClear();
  });

  describe('buildDsl', () => {
    test('should build dsl query', () => {
      hostDetails.buildDsl(mockOptions);
      expect(buildHostDetailsQuery).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('parse', () => {
    test('should parse data correctly', async () => {
      const result = await hostDetails.parse(mockOptions, mockSearchStrategyResponse, mockDeps);
      expect(result).toMatchObject(formattedSearchStrategyResponse);
    });
  });
});
