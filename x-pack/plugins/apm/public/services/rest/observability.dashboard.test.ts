/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchLandingPageData, hasData } from './observability_dashboard';
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

  describe('fetchLandingPageData', () => {
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
      const response = await fetchLandingPageData({
        startTime: '1',
        endTime: '2',
        bucketSize: '3',
      });
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            type: 'number',
            value: 10,
          },
          transactions: {
            type: 'number',
            value: 2,
          },
        },
        series: {
          transactions: {
            coordinates: [
              { x: 1, y: 1 },
              { x: 2, y: 2 },
              { x: 3, y: 3 },
            ],
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
      const response = await fetchLandingPageData({
        startTime: '1',
        endTime: '2',
        bucketSize: '3',
      });
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            type: 'number',
            value: 0,
          },
          transactions: {
            type: 'number',
            value: 0,
          },
        },
        series: {
          transactions: {
            coordinates: [],
          },
        },
      });
    });
    it('returns transaction stat as 0 when y is undefined', async () => {
      callApmApiMock.mockImplementation(() =>
        Promise.resolve({
          serviceCount: 0,
          transactionCoordinates: [{ x: 1 }, { x: 2 }, { x: 3 }],
        })
      );
      const response = await fetchLandingPageData({
        startTime: '1',
        endTime: '2',
        bucketSize: '3',
      });
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            type: 'number',
            value: 0,
          },
          transactions: {
            type: 'number',
            value: 0,
          },
        },
        series: {
          transactions: {
            coordinates: [{ x: 1 }, { x: 2 }, { x: 3 }],
          },
        },
      });
    });
  });
});
