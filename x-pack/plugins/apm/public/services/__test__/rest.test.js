/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kfetchModule from 'ui/kfetch';
import { SessionStorageMock } from './SessionStorageMock';
import { callApi } from '../rest';

describe('rest', () => {
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
    describe('debug param', () => {
      describe('when apm_debug is true', () => {
        beforeEach(() => {
          sessionStorage.setItem('apm_debug', 'true');
        });

        it('should add debug param for APM endpoints', async () => {
          await callApi({ pathname: `/api/apm/status/server` });

          expect(kfetchSpy).toHaveBeenCalledWith(
            { pathname: '/api/apm/status/server', query: { _debug: true } },
            { camelcase: true }
          );
        });

        it('should not add debug param for non-APM endpoints', async () => {
          await callApi({ pathname: `/api/kibana` });

          expect(kfetchSpy).toHaveBeenCalledWith(
            { pathname: '/api/kibana' },
            { camelcase: true }
          );
        });
      });
    });

    describe('camelcase', () => {
      it('camelcase param should be true by default', async () => {
        const res = await callApi({ pathname: `/api/kibana` });

        expect(kfetchSpy).toHaveBeenCalledWith(
          { pathname: '/api/kibana' },
          { camelcase: true }
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
          { camelcase: false }
        );

        expect(res).toEqual({ my_key: 'hello world' });
      });
    });
  });
});
