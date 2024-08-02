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
      expect(pattern).toEqual({
        historyIndexPattern: '.entities.*.history.*',
        latestIndexPattern: '.entities.*.latest.*',
      });

      pattern = indexPatternService.indexPattern({ datasets: 'all', schemaVersion: 'all' });
      expect(pattern).toEqual({
        historyIndexPattern: '.entities.*.history.*',
        latestIndexPattern: '.entities.*.latest.*',
      });
    });

    it('returns dataset-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPattern({ datasets: 'history' });
      expect(pattern).toEqual({ historyIndexPattern: '.entities.*.history.*' });

      pattern = indexPatternService.indexPattern({ datasets: 'latest' });
      expect(pattern).toEqual({ latestIndexPattern: '.entities.*.latest.*' });

      pattern = indexPatternService.indexPattern({ datasets: ['latest', 'history'] });
      expect(pattern).toEqual({
        latestIndexPattern: '.entities.*.latest.*',
        historyIndexPattern: '.entities.*.history.*',
      });
    });

    it('returns version-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPattern({ datasets: 'history', schemaVersion: 'v1' });
      expect(pattern).toEqual({ historyIndexPattern: '.entities.v1.history.*' });

      pattern = indexPatternService.indexPattern({
        datasets: 'latest',
        schemaVersion: ['v1', 'v2'],
      });
      expect(pattern).toEqual({
        latestIndexPattern: '.entities.v1.latest.*,.entities.v2.latest.*',
      });
    });
  });

  describe('#indexPatternByDefinitionId', () => {
    it('returns wide index pattern when all datasets/version specified', () => {
      let pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id');
      expect(pattern).toEqual({
        historyIndexPattern: '.entities.*.history.my_definition_id.*',
        latestIndexPattern: '.entities.*.latest.my_definition_id',
      });

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'all',
        schemaVersion: 'all',
      });
      expect(pattern).toEqual({
        historyIndexPattern: '.entities.*.history.my_definition_id.*',
        latestIndexPattern: '.entities.*.latest.my_definition_id',
      });
    });

    it('returns dataset-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'history',
      });
      expect(pattern).toEqual({ historyIndexPattern: '.entities.*.history.my_definition_id.*' });

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'latest',
      });
      expect(pattern).toEqual({ latestIndexPattern: '.entities.*.latest.my_definition_id' });

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: ['latest', 'history'],
      });
      expect(pattern).toEqual({
        latestIndexPattern: '.entities.*.latest.my_definition_id',
        historyIndexPattern: '.entities.*.history.my_definition_id.*',
      });
    });

    it('returns version-scoped pattern when specified', () => {
      let pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'history',
        schemaVersion: 'v1',
      });
      expect(pattern).toEqual({ historyIndexPattern: '.entities.v1.history.my_definition_id.*' });

      pattern = indexPatternService.indexPatternByDefinitionId('my_definition_id', {
        datasets: 'latest',
        schemaVersion: ['v1', 'v2'],
      });
      expect(pattern).toEqual({
        latestIndexPattern:
          '.entities.v1.latest.my_definition_id,.entities.v2.latest.my_definition_id',
      });
    });

    it('can resolve multiple definitions in one call', async () => {
      const pattern = indexPatternService.indexPatternByDefinitionId(
        ['my_definition_id', 'my_second_definition'],
        {
          datasets: 'latest',
        }
      );
      expect(pattern).toEqual({
        latestIndexPattern:
          '.entities.*.latest.my_definition_id,.entities.*.latest.my_second_definition',
      });
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

      expect(pattern).toEqual({
        historyIndexPattern:
          '.entities.*.history.my_definition_id.*,.entities.*.history.my_definition_id_2.*',
        latestIndexPattern:
          '.entities.*.latest.my_definition_id,.entities.*.latest.my_definition_id_2',
      });
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

      expect(pattern).toEqual({ historyIndexPattern: '.entities.*.history.my_definition_id.*' });
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

      expect(pattern).toEqual({ latestIndexPattern: '.entities.v1.latest.my_definition_id' });
    });

    it('can resolve multiple types in one call', async () => {
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
          {
            id: 'my_definition_id_2',
            type: 'entity-definition',
            references: [],
            score: 0,
            attributes: {
              id: 'my_definition_id_2',
              type: 'host',
            },
          },
        ],
        total: 2,
        page: 1,
        per_page: 2,
      });

      const pattern = await indexPatternService.indexPatternByType(['service', 'host'], {
        soClient,
      });

      expect(soClient.find).toBeCalledTimes(1);
      expect(soClient.find).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          page: 1,
          filter: 'entity-definition.attributes.type:(service or host)',
        })
      );

      expect(pattern).toEqual({
        historyIndexPattern:
          '.entities.*.history.my_definition_id.*,.entities.*.history.my_definition_id_2.*',
        latestIndexPattern:
          '.entities.*.latest.my_definition_id,.entities.*.latest.my_definition_id_2',
      });
    });
  });
});
