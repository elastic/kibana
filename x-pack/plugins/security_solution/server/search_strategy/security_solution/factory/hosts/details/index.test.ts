/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IScopedClusterClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { hostDetails } from '.';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import {
  formattedSearchStrategyResponse,
  mockOptions,
  mockSearchStrategyResponse,
} from './__mocks__';
import * as buildQuery from './query.host_details.dsl';

const mockDeps = {
  esClient: {} as IScopedClusterClient,
  savedObjectsClient: {} as SavedObjectsClientContract,
  endpointContext: createMockEndpointAppContext(),
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
