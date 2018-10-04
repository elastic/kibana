/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kfetchModule from 'ui/kfetch';
import { SessionStorageMock } from './SessionStorageMock';
import { callApi } from '../rest/callApi';

describe('callApi', () => {
  let kfetchSpy;

  beforeEach(() => {
    kfetchSpy = jest.spyOn(kfetchModule, 'kfetch').mockResolvedValue({
      my_key: 'hello world'
    });
    global.sessionStorage = new SessionStorageMock();
  });

  afterEach(() => {
    kfetchSpy.mockClear();
  });

  describe('callApi', () => {
    describe('apm_debug', () => {
      beforeEach(() => {
        sessionStorage.setItem('apm_debug', 'true');
      });

      it('should add debug param for APM endpoints', async () => {
        await callApi({ pathname: `/api/apm/status/server` });

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/apm/status/server', query: { _debug: true } },
          expect.any(Object)
        );
      });

      it('should not add debug param for non-APM endpoints', async () => {
        await callApi({ pathname: `/api/kibana` });

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/kibana' },
          expect.any(Object)
        );
      });
    });

    describe('prependBasePath', () => {
      it('should be true by default', async () => {
        await callApi({ pathname: `/api/kibana` });

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/kibana' },
          { prependBasePath: true }
        );
      });

      it('should respect settings', async () => {
        await callApi({ pathname: `/api/kibana` }, { prependBasePath: false });

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/kibana' },
          { prependBasePath: false }
        );
      });
    });

    describe('camelcase', () => {
      it('should be true by default', async () => {
        const res = await callApi({ pathname: `/api/kibana` });

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/kibana' },
          expect.any(Object)
        );

        expect(res).toEqual({ myKey: 'hello world' });
      });

      it('should respect settings', async () => {
        const res = await callApi(
          { pathname: `/api/kibana` },
          { camelcase: false }
        );

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/kibana' },
          expect.any(Object)
        );

        expect(res).toEqual({ my_key: 'hello world' });
      });
    });
  });
});
