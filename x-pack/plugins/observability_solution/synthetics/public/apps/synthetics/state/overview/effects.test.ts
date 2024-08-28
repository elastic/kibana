/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sagaHelper from 'redux-saga-testing';
import { call, put, select } from 'redux-saga/effects';
import { TRENDS_CHUNK_SIZE, fetchTrendEffect, refreshTrends } from './effects';
import { trendStatsBatch } from './actions';
import { fetchOverviewTrendStats as trendsApi } from './api';
import { TrendKey, TrendTable, selectOverviewTrends } from '.';

const generateTrendRequests = () => {
  const ar: TrendKey[] = [];
  for (let i = 0; i < 30; i++) ar.push({ configId: `configId${i}`, locationId: 'location' });
  return ar;
};

const responseReducer = (
  acc: Record<string, null>,
  curr: { configId: string; locationId: string }
) => ({ ...acc, [curr.configId + curr.locationId]: null });

describe('overview effects', () => {
  describe('fetchTrendEffect', () => {
    const trendRequests = generateTrendRequests();
    const firstChunk = trendRequests.slice(
      trendRequests.length - TRENDS_CHUNK_SIZE,
      trendRequests.length
    );
    const secondChunk = trendRequests.slice(0, 10);
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
      expect(putResult).toEqual(put(trendStatsBatch.success(firstChunkResponse)));
    });

    it('calls the api for the second chunk', (callResult) => {
      expect(callResult).toEqual(call(trendsApi, secondChunk));
      return secondChunkResponse;
    });

    it('sends trends stats success action', (putResult) => {
      expect(putResult).toEqual(put(trendStatsBatch.success(secondChunkResponse)));
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

    it('selects the trends in the table', (selectResult) => {
      expect(selectResult).toEqual(select(selectOverviewTrends));

      return table;
    });

    it('calls the api for the first chunk', (callResult) => {
      expect(callResult).toEqual(
        call(trendsApi, [
          { configId: 'monitor1', locationId: 'location' },
          { configId: 'monitor3', locationId: 'location' },
        ])
      );

      return {
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
    });

    it('sends trends stats success action', (putResult) => {
      expect(putResult).toEqual(
        put(
          trendStatsBatch.success({
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
          })
        )
      );
    });
  });
});
