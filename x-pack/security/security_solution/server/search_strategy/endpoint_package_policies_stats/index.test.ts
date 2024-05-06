/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../endpoint/mocks';
import type { SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { requestEndpointPackagePoliciesStatsSearch } from '.';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { EndpointAppContextService } from '../../endpoint/endpoint_app_context_services';
import moment from 'moment';

const mockPackagePolicyResponse = (inputs: string[]) => ({
  items: inputs.map((input) => ({
    package: { name: 'endpoint' },
    inputs: [
      {
        type: 'endpoint',
        config: { policy: { value: { global_manifest_version: input } } },
      },
    ],
  })),
  total: inputs.length,
  page: 1,
  per_page: 10000,
});

describe('Endpoint package policies stats', () => {
  let endpointAppContextService: EndpointAppContextService;
  let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    endpointAppContextService = createMockEndpointAppContextService();
    mockSavedObjectClient = savedObjectsClientMock.create();
  });

  afterEach(() => endpointAppContextService.stop());

  describe('Returns correct count of outdated manifests', () => {
    const deps = {
      savedObjectsClient: mockSavedObjectClient,
    } as unknown as SearchStrategyDependencies;

    it('when no manifests are outdated.', async () => {
      const listMock = endpointAppContextService.getInternalFleetServices().packagePolicy
        .list as jest.Mock;

      listMock.mockResolvedValueOnce(mockPackagePolicyResponse(['latest', 'latest', 'latest']));
      const response = await requestEndpointPackagePoliciesStatsSearch(
        endpointAppContextService,
        deps
      );
      expect(
        endpointAppContextService.getInternalFleetServices().packagePolicy.list
      ).toBeCalledTimes(1);
      expect(response).toEqual({
        isPartial: false,
        isRunning: false,
        rawResponse: { outdatedManifestsCount: 0 },
      });
    });

    it('when some manifests are outdated.', async () => {
      const listMock = endpointAppContextService.getInternalFleetServices().packagePolicy
        .list as jest.Mock;

      listMock.mockResolvedValueOnce(
        mockPackagePolicyResponse(['2020-01-01', 'latest', '2020-01-01', 'latest'])
      );
      const response = await requestEndpointPackagePoliciesStatsSearch(
        endpointAppContextService,
        deps
      );
      expect(response).toEqual({
        isPartial: false,
        isRunning: false,
        rawResponse: { outdatedManifestsCount: 2 },
      });
    });

    it('when all manifests are outdated but some of them not more than a month', async () => {
      const listMock = endpointAppContextService.getInternalFleetServices().packagePolicy
        .list as jest.Mock;

      listMock.mockResolvedValueOnce(
        mockPackagePolicyResponse([
          '2020-01-01',
          'latest',
          '2020-01-01',
          'latest',
          moment.utc().subtract(1, 'week').format('YYYY-MM-DD'),
          moment.utc().subtract(2, 'week').format('YYYY-MM-DD'),
        ])
      );
      const response = await requestEndpointPackagePoliciesStatsSearch(
        endpointAppContextService,
        deps
      );
      expect(response).toEqual({
        isPartial: false,
        isRunning: false,
        rawResponse: { outdatedManifestsCount: 2 },
      });
    });
  });
});
