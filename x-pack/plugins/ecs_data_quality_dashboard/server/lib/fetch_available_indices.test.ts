/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { FetchAvailableCatIndicesResponseRequired } from './fetch_available_indices';
import { fetchAvailableIndices } from './fetch_available_indices';

function getEsClientMock() {
  return {
    cat: {
      indices: jest.fn().mockResolvedValue([]),
    },
  } as unknown as ElasticsearchClient & {
    cat: {
      indices: jest.Mock<Promise<FetchAvailableCatIndicesResponseRequired>>;
    };
  };
}

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

describe('fetchAvailableIndices', () => {
  const startDate: string = '2021-10-01';
  const endDate: string = '2021-10-07';

  const startDateMillis: number = new Date(startDate).getTime();
  const endDateMillis: number = new Date(endDate).getTime();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when indices are within the date range', () => {
    it('returns indices within the date range', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.10.01',
          'creation.date': `${startDateMillis}`,
        },
        {
          index: 'logs-2021.10.05',
          'creation.date': `${startDateMillis + 4 * DAY_IN_MILLIS}`,
        },
        {
          index: 'logs-2021.09.30',
          'creation.date': `${startDateMillis - DAY_IN_MILLIS}`,
        },
      ]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexPattern: 'logs-*',
        startDate,
        endDate,
      });

      expect(result).toEqual(['logs-2021.10.01', 'logs-2021.10.05']);

      expect(esClientMock.cat.indices).toHaveBeenCalledWith({
        index: 'logs-*',
        format: 'json',
        h: 'index,creation.date',
      });
    });
  });

  describe('when indices are outside the date range', () => {
    it('returns an empty list', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.09.30',
          'creation.date': `${startDateMillis - DAY_IN_MILLIS}`,
        },
        {
          index: 'logs-2021.10.08',
          'creation.date': `${endDateMillis + DAY_IN_MILLIS}`,
        },
      ]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexPattern: 'logs-*',
        startDate,
        endDate,
      });

      expect(result).toEqual([]);
    });
  });

  describe('when no indices match the index pattern', () => {
    it('returns empty buckets', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexPattern: 'nonexistent-*',
        startDate,
        endDate,
      });

      expect(result).toEqual([]);
    });
  });

  describe('rejections', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    describe('when esClient.cat.indices rejects', () => {
      it('throws an error', async () => {
        const esClientMock = getEsClientMock();

        esClientMock.cat.indices.mockRejectedValue(new Error('Elasticsearch error'));

        await expect(
          fetchAvailableIndices(esClientMock, {
            indexPattern: 'logs-*',
            startDate,
            endDate,
          })
        ).rejects.toThrow('Elasticsearch error');
      });
    });

    describe('when startDate is invalid', () => {
      it('throws an error', async () => {
        const esClientMock = getEsClientMock();

        await expect(
          fetchAvailableIndices(esClientMock, {
            indexPattern: 'logs-*',
            startDate: 'invalid-date',
            endDate,
          })
        ).rejects.toThrow('Invalid date format in startDate or endDate');
      });
    });

    describe('when endDate is invalid', () => {
      it('throws an error', async () => {
        const esClientMock = getEsClientMock();

        await expect(
          fetchAvailableIndices(esClientMock, {
            indexPattern: 'logs-*',
            startDate,
            endDate: 'invalid-date',
          })
        ).rejects.toThrow('Invalid date format in startDate or endDate');
      });
    });
  });
});
