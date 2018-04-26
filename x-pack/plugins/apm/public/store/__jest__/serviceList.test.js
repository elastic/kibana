/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  loadServiceList,
  SERVICE_LIST_LOADING,
  SERVICE_LIST_SUCCESS
} from '../serviceList';
import { getKey } from '../apiHelpers';
import fetchMock from 'fetch-mock';
import response from './services-response.json';

describe('loadServiceList', () => {
  const key = getKey({ start: 'myStart', end: 'myEnd' });
  const dispatch = jest.fn();
  const matcherName = /\/api\/apm\/services/;

  beforeEach(() => {
    fetchMock.get(matcherName, response);
    return loadServiceList({
      start: 'myStart',
      end: 'myEnd'
    })(dispatch);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('should make a http request', () => {
    expect(fetchMock.lastUrl(matcherName)).toContain(
      '/api/apm/services?start=myStart&end=myEnd'
    );
  });

  it('should dispatch SERVICE_LIST_LOADING', () => {
    expect(dispatch).toHaveBeenCalledWith({
      keyArgs: { start: 'myStart', end: 'myEnd' },
      type: SERVICE_LIST_LOADING,
      key
    });
  });

  it('should dispatch SERVICE_LIST_SUCCESS with http response', () => {
    expect(dispatch).toHaveBeenCalledWith({
      keyArgs: { start: 'myStart', end: 'myEnd' },
      response,
      type: SERVICE_LIST_SUCCESS,
      key
    });
  });
});
