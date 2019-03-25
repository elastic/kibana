/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kfetchModule from 'ui/kfetch';
import { mockNow } from '../../utils/testHelpers';
import { _clearCache, callApi } from '../rest/callApi';
import { SessionStorageMock } from './SessionStorageMock';

describe('callApi', () => {
  let kfetchSpy: jest.Mock;

  beforeEach(() => {
    kfetchSpy = jest.spyOn(kfetchModule, 'kfetch').mockResolvedValue({
      my_key: 'hello world'
    });
    // @ts-ignore
    global.sessionStorage = new SessionStorageMock();
  });

  afterEach(() => {
    kfetchSpy.mockClear();
    _clearCache();
  });

  describe('apm_debug', () => {
    beforeEach(() => {
      sessionStorage.setItem('apm_debug', 'true');
    });

    it('should add debug param for APM endpoints', async () => {
      await callApi({ pathname: `/api/apm/status/server` });

      expect(kfetchSpy).toHaveBeenCalledWith(
        { pathname: '/api/apm/status/server', query: { _debug: true } },
        undefined
      );
    });

    it('should not add debug param for non-APM endpoints', async () => {
      await callApi({ pathname: `/api/kibana` });

      expect(kfetchSpy).toHaveBeenCalledWith(
        { pathname: '/api/kibana' },
        undefined
      );
    });
  });

  describe('prependBasePath', () => {
    it('should be passed on to kFetch', async () => {
      await callApi({ pathname: `/api/kibana` }, { prependBasePath: false });

      expect(kfetchSpy).toHaveBeenCalledWith(
        { pathname: '/api/kibana' },
        { prependBasePath: false }
      );
    });
  });

  describe('cache', () => {
    it('should return cached response for subsequent calls with identical arguments', async () => {
      await callApi({ pathname: `/api/kibana`, query: { foo: 'bar' } });
      await callApi({ pathname: `/api/kibana`, query: { foo: 'bar' } });
      await callApi({ pathname: `/api/kibana`, query: { foo: 'bar' } });

      expect(kfetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should not return cached response for subsequent calls if arguments change', async () => {
      await callApi({ pathname: `/api/kibana`, query: { foo: 'bar1' } });
      await callApi({ pathname: `/api/kibana`, query: { foo: 'bar2' } });
      await callApi({ pathname: `/api/kibana`, query: { foo: 'bar3' } });

      expect(kfetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should not return cached response if calls contain `end` param in the future', async () => {
      const nowSpy = mockNow('2019-01-10');
      await callApi({ pathname: `/api/kibana`, query: { end: '2019-01-11' } });
      await callApi({ pathname: `/api/kibana`, query: { end: '2019-01-11' } });
      await callApi({ pathname: `/api/kibana`, query: { end: '2019-01-11' } });

      expect(kfetchSpy).toHaveBeenCalledTimes(3);
      nowSpy.mockRestore();
    });

    it('should return cached response if calls contain `end` param in the past', async () => {
      const nowSpy = mockNow('2019-01-10');
      await callApi({ pathname: `/api/kibana`, query: { end: '2019-01-09' } });
      await callApi({ pathname: `/api/kibana`, query: { end: '2019-01-09' } });
      await callApi({ pathname: `/api/kibana`, query: { end: '2019-01-09' } });

      expect(kfetchSpy).toHaveBeenCalledTimes(1);
      nowSpy.mockRestore();
    });
  });
});
