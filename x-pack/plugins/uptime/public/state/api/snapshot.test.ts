/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchError } from 'src/core/public';
import { fetchSnapshotCount } from './snapshot';
import { apiService } from './utils';
import { API_URLS } from '../../../common/constants';

describe('snapshot API', () => {
  let fetchMock: jest.SpyInstance<Partial<unknown>>;
  let mockResponse: Partial<unknown>;

  beforeEach(() => {
    apiService.http = {
      get: jest.fn(),
      fetch: jest.fn(),
    } as any;
    apiService.addInspectorRequest = jest.fn();
    fetchMock = jest.spyOn(apiService.http, 'fetch');
    mockResponse = { up: 3, down: 12, total: 15 };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls url with expected params and returns response body on 200', async () => {
    fetchMock.mockReturnValue(new Promise((r) => r(mockResponse)));
    const resp = await fetchSnapshotCount({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      filters: 'monitor.id:"auto-http-0X21EE76EAC459873F"',
    });
    expect(fetchMock).toHaveBeenCalledWith({
      asResponse: false,
      path: API_URLS.SNAPSHOT_COUNT,
      query: {
        dateRangeEnd: 'now',
        dateRangeStart: 'now-15m',
        filters: 'monitor.id:"auto-http-0X21EE76EAC459873F"',
      },
    });
    expect(resp).toEqual({ up: 3, down: 12, total: 15 });
  });

  it(`throws when server response doesn't correspond to expected type`, async () => {
    mockResponse = { foo: 'bar' };
    fetchMock.mockReturnValue(new Promise((r) => r(mockResponse)));
    const result = await fetchSnapshotCount({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      filters: 'monitor.id: baz',
    });

    expect(result).toMatchSnapshot();
  });

  it('throws an error when response is not ok', async () => {
    mockResponse = new HttpFetchError('There was an error fetching your data.', 'error', {} as any);
    fetchMock.mockReturnValue(mockResponse);
    const result = await fetchSnapshotCount({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
    });

    expect(result).toEqual(new Error('There was an error fetching your data.'));
  });
});
