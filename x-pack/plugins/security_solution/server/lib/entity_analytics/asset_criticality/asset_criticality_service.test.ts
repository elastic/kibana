/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import type { AssetCriticalityDataClient } from './asset_criticality_data_client';
import { assetCriticalityDataClientMock } from './asset_criticality_data_client.mock';
import { assetCriticalityServiceFactory } from './asset_criticality_service';

const buildMockCriticalityHit = (
  overrides: Partial<AssetCriticalityRecord> = {}
): SearchHit<AssetCriticalityRecord> => ({
  _id: 'host.name:not-found',
  _index: '.asset-criticality-default',
  _source: {
    '@timestamp': '2021-09-16T15:00:00.000Z',
    id_field: 'host.name',
    id_value: 'hostname',
    criticality_level: 'normal',
    ...overrides,
  },
});

describe('AssetCriticalityService', () => {
  describe('#getCriticalitiesByIdentifiers()', () => {
    let baseIdentifier: { id_field: string; id_value: string };
    let mockAssetCriticalityDataClient: AssetCriticalityDataClient;

    beforeEach(() => {
      mockAssetCriticalityDataClient = assetCriticalityDataClientMock.create();
      baseIdentifier = { id_field: 'host.name', id_value: 'not-found' };

      (mockAssetCriticalityDataClient.search as jest.Mock).mockResolvedValueOnce({
        hits: { hits: [] },
      });
    });

    describe('specifying a single identifier', () => {
      it('returns an empty response if identifier is not found', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);

        expect(result).toEqual([]);
      });

      it('returns a single criticality if identifier is found', async () => {
        const hits = [buildMockCriticalityHit()];
        (mockAssetCriticalityDataClient.search as jest.Mock).mockReset().mockResolvedValueOnce({
          hits: { hits },
        });

        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);

        expect(result).toEqual(hits.map((hit) => hit._source));
      });
    });

    describe('specifying multiple identifiers', () => {
      it('returns an empty response if identifier is not found', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);

        expect(result).toEqual([]);
      });

      it('deduplicates identifiers', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const duplicateIdentifiers = [
          { id_field: 'user.name', id_value: 'same' },
          { id_field: 'user.name', id_value: 'same' },
        ];
        await service.getCriticalitiesByIdentifiers(duplicateIdentifiers);

        expect(mockAssetCriticalityDataClient.search).toHaveBeenCalledTimes(1);
        const query = (mockAssetCriticalityDataClient.search as jest.Mock).mock.calls[0][0].query;
        expect(query).toMatchObject({
          bool: {
            must: {
              bool: {
                should: [{ terms: { 'user.name': ['same'] } }],
              },
            },
          },
        });
      });

      it('returns multiple criticalities if identifiers are found', async () => {
        const hits = [
          buildMockCriticalityHit(),
          buildMockCriticalityHit({
            id_field: 'user.name',
            id_value: 'username',
            criticality_level: 'very_important',
          }),
        ];

        (mockAssetCriticalityDataClient.search as jest.Mock).mockReset().mockResolvedValueOnce({
          hits: {
            hits,
          },
        });
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);
        expect(result).toEqual(hits.map((hit) => hit._source));
      });
    });

    describe('arguments', () => {
      it('accepts a single identifier as an array', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const identifier = { id_field: 'host.name', id_value: 'foo' };

        expect(() => service.getCriticalitiesByIdentifiers([identifier])).not.toThrow();
      });

      it('accepts multiple identifiers', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const identifiers = [
          { id_field: 'host.name', id_value: 'foo' },
          { id_field: 'user.name', id_value: 'bar' },
        ];
        expect(() => service.getCriticalitiesByIdentifiers(identifiers)).not.toThrow();
      });

      it('throws an error if an empty array is provided', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        await expect(() => service.getCriticalitiesByIdentifiers([])).rejects.toThrowError(
          'At least one identifier must be provided'
        );
      });

      it('throws an error if no identifier values are provided', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        await expect(() =>
          service.getCriticalitiesByIdentifiers([{ id_field: 'host.name', id_value: '' }])
        ).rejects.toThrowError('At least one identifier must contain a valid field and value');
      });

      it('throws an error if no valid identifier field/value pair is provided', async () => {
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        const identifiers = [
          { id_field: '', id_value: 'foo' },
          { id_field: 'user.name', id_value: '' },
        ];
        await expect(() => service.getCriticalitiesByIdentifiers(identifiers)).rejects.toThrowError(
          'At least one identifier must contain a valid field and value'
        );
      });
    });

    describe('error conditions', () => {
      it('throws an error if the client does', async () => {
        (mockAssetCriticalityDataClient.search as jest.Mock)
          .mockReset()
          .mockRejectedValueOnce(new Error('foo'));
        const service = assetCriticalityServiceFactory({
          assetCriticalityDataClient: mockAssetCriticalityDataClient,
        });
        await expect(() =>
          service.getCriticalitiesByIdentifiers([baseIdentifier])
        ).rejects.toThrowError('foo');
      });
    });
  });
});
