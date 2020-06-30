/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchLandingPageData, hasData } from './observability_dashboard';
import * as createCallApmApi from './createCallApmApi';
import { euiThemeVars as theme } from '@kbn/ui-shared-deps/theme';

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
      const response = await fetchLandingPageData(
        {
          startTime: '1',
          endTime: '2',
          bucketSize: '3',
        },
        { theme }
      );
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            type: 'number',
            label: 'Services',
            value: 10,
          },
          transactions: {
            type: 'number',
            label: 'Transactions',
            value: 6,
            color: '#6092c0',
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
            color: '#6092c0',
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
      const response = await fetchLandingPageData(
        {
          startTime: '1',
          endTime: '2',
          bucketSize: '3',
        },
        { theme }
      );
      expect(response).toEqual({
        title: 'APM',
        appLink: '/app/apm',
        stats: {
          services: {
            type: 'number',
            label: 'Services',
            value: 0,
          },
          transactions: {
            type: 'number',
            label: 'Transactions',
            value: 0,
            color: '#6092c0',
          },
        },
        series: {
          transactions: {
            label: 'Transactions',
            coordinates: [],
            color: '#6092c0',
          },
        },
      });
    });
  });
});
