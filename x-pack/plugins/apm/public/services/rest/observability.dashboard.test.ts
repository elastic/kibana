/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchData, hasData } from './observability_dashboard';
import * as createCallApmApi from './createCallApmApi';

describe('Observability dashboard data', () => {
  const callApmApiMock = jest.spyOn(createCallApmApi, 'callApmApi');
  afterEach(() => {
    callApmApiMock.mockClear();
  });
  describe('hasData', () => {
    it('returns false when no data is available', async () => {
      callApmApiMock.mockImplementation(() => Promise.resolve(false));
      const response = await hasData();
      expect(response).toBeFalsy();
    });
    it('returns true when data is available', async () => {
      callApmApiMock.mockImplementation(() => Promise.resolve(true));
      const response = await hasData();
      expect(response).toBeTruthy();
    });
  });

  describe('fetchData', () => {
    it('returns APM data with series and stats', async () => {
      callApmApiMock.mockImplementation(() =>
        Promise.resolve({
          serviceCount: 10,
          transactionCoordinates: [
            { x: 1, y: 1 },
            { x: 2, y: 2 },
            { x: 3, y: 3 },
          ],
        })
      );
      const response = await fetchData({
        startTime: '1',
        endTime: '2',
        bucketSize: '3',
      });
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            label: 'Services',
            value: 10,
          },
          transactions: {
            label: 'Transactions',
            value: 6,
          },
        },
        series: {
          transactions: {
            label: 'Transactions',
            coordinates: [
              { x: 1, y: 1 },
              { x: 2, y: 2 },
              { x: 3, y: 3 },
            ],
            color: 'euiColorVis1',
          },
        },
      });
    });
    it('returns empty transaction coordinates', async () => {
      callApmApiMock.mockImplementation(() =>
        Promise.resolve({
          serviceCount: 0,
          transactionCoordinates: [],
        })
      );
      const response = await fetchData({
        startTime: '1',
        endTime: '2',
        bucketSize: '3',
      });
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            label: 'Services',
            value: 0,
          },
          transactions: {
            label: 'Transactions',
            value: 0,
          },
        },
        series: {
          transactions: {
            label: 'Transactions',
            coordinates: [],
            color: 'euiColorVis1',
          },
        },
      });
    });
  });
});
