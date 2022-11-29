/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { fieldsBeat as beatFields } from '@kbn/timelines-plugin/server/utils/beat_schema/fields';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import { requestEventFiltersFieldsSearch } from '.';
import { createMockEndpointAppContextService } from '../../endpoint/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../common/endpoint/service/authz/mocks';

describe('Event filters fields', () => {
  const getFieldsForWildcardMock = jest.fn();
  const esClientSearchMock = jest.fn();
  const esClientFieldCapsMock = jest.fn();
  const endpointAppContextService = createMockEndpointAppContextService();

  const deps = {
    esClient: {
      asInternalUser: { search: esClientSearchMock, fieldCaps: esClientFieldCapsMock },
    },
  } as unknown as SearchStrategyDependencies;

  beforeAll(() => {
    getFieldsForWildcardMock.mockResolvedValue([]);
    esClientSearchMock.mockResolvedValue({ hits: { total: { value: 123 } } });
    esClientFieldCapsMock.mockResolvedValue({ indices: ['value'] });
    IndexPatternsFetcher.prototype.getFieldsForWildcard = getFieldsForWildcardMock;
  });

  beforeEach(() => {
    getFieldsForWildcardMock.mockClear();
    esClientSearchMock.mockClear();
    esClientFieldCapsMock.mockClear();
  });

  afterAll(() => {
    getFieldsForWildcardMock.mockRestore();
  });
  describe('with right privileges', () => {
    it('should check index exists', async () => {
      const indices = ['logs-endpoint.events.*'];
      const request = {
        indices,
        onlyCheckIfIndicesExist: true,
      };

      const response = await requestEventFiltersFieldsSearch(
        request,
        deps,
        beatFields,
        endpointAppContextService
      );
      expect(response.indexFields).toHaveLength(0);
      expect(response.indicesExist).toEqual(indices);
    });

    it('should search index fields', async () => {
      const indices = ['logs-endpoint.events.*'];
      const request = {
        indices,
        onlyCheckIfIndicesExist: false,
      };

      const response = await requestEventFiltersFieldsSearch(
        request,
        deps,
        beatFields,
        endpointAppContextService
      );

      expect(getFieldsForWildcardMock).toHaveBeenCalledWith({ pattern: indices[0] });

      expect(response.indexFields).not.toHaveLength(0);
      expect(response.indicesExist).toEqual(indices);
    });

    it('should throw when invalid index', async () => {
      const indices = ['invalid'];
      const request = {
        indices,
        onlyCheckIfIndicesExist: false,
      };

      await expect(async () => {
        await requestEventFiltersFieldsSearch(request, deps, beatFields, endpointAppContextService);
      }).rejects.toThrowError('Invalid indices request invalid');
    });
  });

  describe('without right privileges', () => {
    beforeEach(() => {
      (endpointAppContextService.getEndpointAuthz as jest.Mock).mockResolvedValue(
        getEndpointAuthzInitialStateMock({ canReadEventFilters: true, canWriteEventFilters: false })
      );
    });

    it('should throw because not enough privileges', async () => {
      const indices = ['logs-endpoint.events.*'];
      const request = {
        indices,
        onlyCheckIfIndicesExist: false,
      };

      await expect(async () => {
        await requestEventFiltersFieldsSearch(request, deps, beatFields, endpointAppContextService);
      }).rejects.toThrowError('Endpoint authz error');
    });
  });
});
