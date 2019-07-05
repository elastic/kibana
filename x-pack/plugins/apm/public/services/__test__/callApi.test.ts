/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as kfetchModule from 'ui/kfetch';
import { callApi } from '../rest/callApi';
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
  });
});
