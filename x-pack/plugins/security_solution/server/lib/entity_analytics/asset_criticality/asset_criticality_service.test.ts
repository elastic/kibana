/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { assetCriticalityServiceFactory } from './asset_criticality_service';

const buildMockCriticalityRecord = () => ({
  _id: 'host.name:not-found',
  _index: '.asset-criticality-default',
  _source: {
    '@timestamp': '2021-09-16T15:00:00.000Z',
    id_field: 'host.name',
    id_value: 'found',
    criticality_level: 'critical',
  },
});

describe('AssetCriticalityService', () => {
  describe('#getCriticalitiesByIdentifiers()', () => {
    let baseIdentifier: { id_field: string; id_value: string };
    let esClientMock: ElasticsearchClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
      baseIdentifier = { id_field: 'host.name', id_value: 'not-found' };

      (esClientMock.search as jest.Mock).mockResolvedValueOnce({ hits: { hits: [] } });
    });

    describe('specifying a single identifier', () => {
      it('returns an empty response if identifier is not found', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);
        expect(result).toEqual([]);
      });

      it('returns a single criticality if identifier is found', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);
        expect(result).toEqual(['critical']);
      });
    });

    describe('specifying multiple identifiers', () => {
      it('returns an empty response if identifier is not found', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);
        expect(result).toEqual([]);
      });

      it.skip('deduplicates identifiers', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const duplicateIdentifiers = [
          { id_field: 'user.name', id_value: 'same' },
          { id_field: 'user.name', id_value: 'same' },
        ];
        await service.getCriticalitiesByIdentifiers(duplicateIdentifiers);

        expect(esClientMock.search).toHaveBeenCalledOnce();
        expect(esClientMock.search).toHaveBeenCalledWith({
          id_field: 'user.name',
          id_value: 'same',
        });
      });

      it('returns multiple criticalities if identifiers are found', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const result = await service.getCriticalitiesByIdentifiers([baseIdentifier]);
        expect(result).toEqual(['critical']);
      });
    });

    describe('arguments', () => {
      it('accepts a single identifier as an array', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const identifier = { id_field: 'host.name', id_value: 'foo' };

        expect(() => service.getCriticalitiesByIdentifiers([identifier])).not.toThrow();
      });

      it('accepts multiple identifiers', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        const identifiers = [
          { id_field: 'host.name', id_value: 'foo' },
          { id_field: 'user.name', id_value: 'bar' },
        ];
        expect(() => service.getCriticalitiesByIdentifiers(identifiers)).not.toThrow();
      });

      it('throws an error if an empty array is provided', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        await expect(() => service.getCriticalitiesByIdentifiers([])).rejects.toThrowError(
          'At least one identifier must be provided'
        );
      });

      it('throws an error if no identifier values are provided', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
        await expect(() =>
          service.getCriticalitiesByIdentifiers([{ id_field: 'host.name', id_value: '' }])
        ).rejects.toThrowError('At least one identifier must contain a valid field and value');
      });

      it('throws an error if no valid identifier field/value pair is provided', async () => {
        const service = assetCriticalityServiceFactory({ esClient: esClientMock });
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
      it.todo('throws an error if the client does');
    });
  });
});
