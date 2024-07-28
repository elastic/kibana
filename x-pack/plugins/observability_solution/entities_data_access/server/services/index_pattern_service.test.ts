/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { createIndexPatternService } from './index_pattern_service';

describe('index_pattern_service', () => {
  const indexPatternService = createIndexPatternService();

  describe('#indexPattern', () => {
    it('returns wide index pattern when all datasets and version specified', () => {
      let pattern = indexPatternService.indexPattern();
      expect(pattern).toEqual('.entities.*.*.*');

      pattern = indexPatternService.indexPattern({ datasets: 'all', schemaVersion: 'all' });
      expect(pattern).toEqual('.entities.*.*.*');
    });

    it('returns dataset-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPattern({ datasets: 'history' });
      expect(pattern).toEqual('.entities.*.history.*');

      pattern = indexPatternService.indexPattern({ datasets: 'latest' });
      expect(pattern).toEqual('.entities.*.latest.*');
    });

    it('returns version-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPattern({ datasets: 'history', schemaVersion: 'v1' });
      expect(pattern).toEqual('.entities.v1.history.*');

      pattern = indexPatternService.indexPattern({
        datasets: 'latest',
        schemaVersion: ['v1', 'v2'],
      });
      expect(pattern).toEqual('.entities.v1.latest.*,.entities.v2.latest.*');
    });
  });

  describe('#indexPatternByDefinitionId', () => {
    it('returns wide index pattern when all datasets/version specified', () => {
      let pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id');
      expect(pattern).toEqual(
        '.entities.*.latest.my_definition_id,.entities.*.history.my_definition_id.*'
      );

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'all',
        schemaVersion: 'all',
      });
      expect(pattern).toEqual(
        '.entities.*.latest.my_definition_id,.entities.*.history.my_definition_id.*'
      );
    });

    it('returns dataset-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'history',
      });
      expect(pattern).toEqual('.entities.*.history.my_definition_id.*');

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'latest',
      });
      expect(pattern).toEqual('.entities.*.latest.my_definition_id');
    });

    it('returns version-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPattern({ datasets: 'history', schemaVersion: 'v1' });
      expect(pattern).toEqual('.entities.v1.history.*');

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'latest',
        schemaVersion: ['v1', 'v2'],
      });
      expect(pattern).toEqual(
        '.entities.v1.latest.my_definition_id,.entities.v2.latest.my_definition_id'
      );
    });
  });

  describe('#indexPatternByType', () => {
    it('returns wide index pattern when all datasets/version specified', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'my_definition_id',
              type: 'entity-definition',
              references: [],
              score: 0,
              attributes: {
                id: 'my_definition_id',
                type: 'service',
              },
            },
          ],
          total: 2,
          page: 1,
          per_page: 1,
        })
        .mockResolvedValueOnce({
          saved_objects: [
            {
              id: 'my_definition_id_2',
              type: 'entity-definition',
              references: [],
              score: 0,
              attributes: {
                id: 'my_definition_id_2',
                type: 'service',
              },
            },
          ],
          total: 2,
          page: 2,
          per_page: 1,
        });

      const pattern = await indexPatternService.indexPatternByType('service', { soClient });

      expect(soClient.find).toBeCalledTimes(2);
      expect(soClient.find).toHaveBeenNthCalledWith(1, expect.objectContaining({ page: 1 }));
      expect(soClient.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2 }));

      expect(pattern).toEqual(
        [
          '.entities.*.latest.my_definition_id,.entities.*.history.my_definition_id.*',
          '.entities.*.latest.my_definition_id_2,.entities.*.history.my_definition_id_2.*',
        ].join(',')
      );
    });

    it('returns dataset-scoped pattern when specified', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'my_definition_id',
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              id: 'my_definition_id',
              type: 'service',
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 1,
      });

      const pattern = await indexPatternService.indexPatternByType('service', {
        soClient,
        datasets: 'history',
      });
      expect(soClient.find).toBeCalledTimes(1);

      expect(pattern).toEqual('.entities.*.history.my_definition_id.*');
    });

    it('returns version-scoped pattern when specified', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: 'my_definition_id',
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              id: 'my_definition_id',
              type: 'service',
            },
          },
        ],
        total: 1,
        page: 1,
        per_page: 1,
      });

      const pattern = await indexPatternService.indexPatternByType('service', {
        soClient,
        datasets: 'latest',
        schemaVersion: 'v1',
      });
      expect(soClient.find).toBeCalledTimes(1);

      expect(pattern).toEqual('.entities.v1.latest.my_definition_id');
    });
  });
});
