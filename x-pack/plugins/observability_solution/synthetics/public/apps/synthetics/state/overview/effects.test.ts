/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sagaHelper from 'redux-saga-testing';
import { call, put, select } from 'redux-saga/effects';
import { GetTrendPayload, TrendKey, TrendRequest, TrendTable } from '../../../../../common/types';
import { TRENDS_CHUNK_SIZE, fetchTrendEffect, refreshTrends } from './effects';
import { trendStatsBatch } from './actions';
import { fetchOverviewTrendStats as trendsApi } from './api';
import { selectOverviewState, selectOverviewTrends } from '.';

const TEST_TRENDS_LENGTH = 80;

const generateTrendRequests = () => {
  const ar: TrendRequest[] = [];
  for (let i = 0; i < TEST_TRENDS_LENGTH; i++)
    ar.push({ configId: `configId${i}`, locationId: 'location', schedule: '3' });
  return ar;
};

const responseReducer = (acc: Record<string, null>, curr: TrendKey) => ({
  ...acc,
  [curr.configId + curr.locationId]: null,
});

describe('overview effects', () => {
  describe('fetchTrendEffect', () => {
    const trendRequests = generateTrendRequests();
    const firstChunk = trendRequests.slice(
      trendRequests.length - TRENDS_CHUNK_SIZE,
      trendRequests.length
    );
    const secondChunk = trendRequests.slice(0, TEST_TRENDS_LENGTH - TRENDS_CHUNK_SIZE);
    const firstChunkResponse = firstChunk.reduce(responseReducer, {});
    const secondChunkResponse = secondChunk.reduce(responseReducer, {});

    const it = sagaHelper(
      fetchTrendEffect(trendStatsBatch.get(trendRequests)) as IterableIterator<TrendTable>
    );

    it('calls the `trendsApi` with the first chunk of trend requests', (callResult) => {
      expect(callResult).toEqual(call(trendsApi, firstChunk));
      return firstChunkResponse;
    });

    it('sends trends stats success action', (putResult) => {
      expect(putResult).toEqual(
        put(trendStatsBatch.success({ trendStats: firstChunkResponse, batch: firstChunk }))
      );
    });

    it('calls the api for the second chunk', (callResult) => {
      expect(callResult).toEqual(call(trendsApi, secondChunk));
      return secondChunkResponse;
    });

    it('sends trends stats success action', (putResult) => {
      expect(putResult).toEqual(
        put(trendStatsBatch.success({ trendStats: secondChunkResponse, batch: secondChunk }))
      );
    });

    it('terminates', (result) => {
      expect(result).toBeUndefined();
    });
  });

  describe('refreshTrends with no data', () => {
    const it = sagaHelper(refreshTrends() as IterableIterator<TrendTable>);

    it('selects the trends in the table', (selectResult) => {
      expect(selectResult).toEqual(select(selectOverviewTrends));
      return { monitor1: null, monitor2: null, monitor3: null };
    });

    it('selects the overview state', (selectResult) => {
      expect(selectResult).toEqual(select(selectOverviewState));
      return { data: { monitors: [] } };
    });

    it('skips the API if the data is null', (result) => {
      expect(result).toBeUndefined();
    });
  });

  describe('refreshTrends with data', () => {
    const it = sagaHelper(refreshTrends() as IterableIterator<TrendTable>);
    const table: TrendTable = {
      monitor1: {
        configId: 'monitor1',
        locationId: 'location',
        data: [{ x: 0, y: 1 }],
        count: 1,
        median: 1,
        min: 0,
        max: 0,
        avg: 0,
        sum: 0,
      },
      monitor2: null,
      monitor3: {
        configId: 'monitor3',
        locationId: 'location',
        data: [{ x: 0, y: 1 }],
        count: 1,
        median: 1,
        min: 0,
        max: 0,
        avg: 0,
        sum: 0,
      },
    };

    const batch = [
      { configId: 'monitor1', locationId: 'location', schedule: '3' },
      { configId: 'monitor3', locationId: 'location', schedule: '3' },
    ];
    const apiResponse: TrendTable = {
      monitor1: {
        configId: 'monitor1',
        locationId: 'location',
        data: [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
        ],
        count: 2,
        median: 2,
        min: 1,
        max: 1,
        avg: 1,
        sum: 1,
      },
      monitor2: {
        configId: 'monitor2',
        locationId: 'location',
        data: [
          { x: 0, y: 1 },
          { x: 1, y: 2 },
        ],
        count: 2,
        median: 2,
        min: 1,
        max: 1,
        avg: 1,
        sum: 1,
      },
    };

    const successPayload: GetTrendPayload = {
      trendStats: apiResponse,
      batch,
    };

    it('selects the trends in the table', (selectResult) => {
      expect(selectResult).toEqual(select(selectOverviewTrends));

      return table;
    });

    it('selects the overview state', (selectResults) => {
      expect(selectResults).toEqual(select(selectOverviewState));
      return {
        data: {
          monitors: [
            { configId: 'monitor1', schedule: '3' },
            { configId: 'monitor3', schedule: '3' },
          ],
        },
      };
    });

    it('calls the api for the first chunk', (callResult) => {
      expect(callResult).toEqual(call(trendsApi, batch));

      return apiResponse;
    });

    it('sends trends stats success action', (putResult) => {
      expect(putResult).toEqual(put(trendStatsBatch.success(successPayload)));
    });
  });
});
