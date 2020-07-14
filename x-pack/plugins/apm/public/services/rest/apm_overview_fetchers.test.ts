/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { fetchOverviewPageData, hasData } from './apm_overview_fetchers';
import * as createCallApmApi from './createCallApmApi';

describe('Observability dashboard data', () => {
  const callApmApiMock = jest.spyOn(createCallApmApi, 'callApmApi');
  const params = {
    absoluteTime: {
      start: moment('2020-07-02T13:25:11.629Z').valueOf(),
      end: moment('2020-07-09T14:25:11.629Z').valueOf(),
    },
    relativeTime: {
      start: 'now-15m',
      end: 'now',
    },
    bucketSize: '600s',
  };
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

  describe('fetchOverviewPageData', () => {
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
      const response = await fetchOverviewPageData(params);
      expect(response).toEqual({
        appLink: '/app/apm#/services?rangeFrom=now-15m&rangeTo=now',
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
      const response = await fetchOverviewPageData(params);
      expect(response).toEqual({
        appLink: '/app/apm#/services?rangeFrom=now-15m&rangeTo=now',
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
      const response = await fetchOverviewPageData(params);
      expect(response).toEqual({
        appLink: '/app/apm#/services?rangeFrom=now-15m&rangeTo=now',
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
