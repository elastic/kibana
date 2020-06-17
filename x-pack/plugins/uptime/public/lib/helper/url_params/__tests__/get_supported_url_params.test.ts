/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { getSupportedUrlParams } from '../get_supported_url_params';

describe('getSupportedUrlParams', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns custom values', () => {
    const customValues = {
      autorefreshInterval: '23',
      autorefreshIsPaused: 'false',
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      monitorListPageIndex: '23',
      monitorListPageSize: '50',
      monitorListSortDirection: 'desc',
      monitorListSortField: 'monitor.status',
      search: 'monitor.status: down',
      selectedPingStatus: 'up',
    };
    expect(getSupportedUrlParams(customValues)).toMatchInlineSnapshot(`
      Object {
        "autorefreshInterval": 23,
        "autorefreshIsPaused": false,
        "dateRangeEnd": "now",
        "dateRangeStart": "now-15m",
        "filters": "",
        "pagination": undefined,
        "search": "monitor.status: down",
        "statusFilter": "",
      }
    `);
  });

  it('returns default values', () => {
    expect(getSupportedUrlParams({})).toMatchInlineSnapshot(`
      Object {
        "autorefreshInterval": 60000,
        "autorefreshIsPaused": false,
        "dateRangeEnd": "now",
        "dateRangeStart": "now-15m",
        "filters": "",
        "pagination": undefined,
        "search": "",
        "statusFilter": "",
      }
    `);
  });

  it('returns the first item for string arrays', () => {
    const result = getSupportedUrlParams({
      dateRangeStart: ['now-18d', 'now-11d', 'now-5m'],
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "autorefreshInterval": 60000,
        "autorefreshIsPaused": false,
        "dateRangeEnd": "now",
        "dateRangeStart": "now-18d",
        "filters": "",
        "pagination": undefined,
        "search": "",
        "statusFilter": "",
      }
    `);
  });

  it('provides defaults for undefined values', () => {
    const result = getSupportedUrlParams({
      dateRangeStart: undefined,
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "autorefreshInterval": 60000,
        "autorefreshIsPaused": false,
        "dateRangeEnd": "now",
        "dateRangeStart": "now-15m",
        "filters": "",
        "pagination": undefined,
        "search": "",
        "statusFilter": "",
      }
    `);
  });

  it('provides defaults for empty string array values', () => {
    const result = getSupportedUrlParams({
      dateRangeStart: [],
    });
    expect(result).toMatchInlineSnapshot(`
      Object {
        "autorefreshInterval": 60000,
        "autorefreshIsPaused": false,
        "dateRangeEnd": "now",
        "dateRangeStart": "now-15m",
        "filters": "",
        "pagination": undefined,
        "search": "",
        "statusFilter": "",
      }
    `);
  });
});
