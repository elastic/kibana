/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockNow } from '../utils/test_helpers';
import { clearCache, callApi } from './rest/call_api';
import { CoreStart, HttpSetup } from '@kbn/core/public';

type CoreMock = CoreStart & {
  http: {
    get: jest.SpyInstance<HttpSetup['get']>;
  };
};

describe('callApi', () => {
  let core: CoreMock;

  beforeEach(() => {
    core = {
      http: {
        get: jest.fn().mockReturnValue({
          my_key: 'hello_world',
        }),
      },
      uiSettings: { get: () => false }, // disable `observability:enableInspectEsQueries` setting
    } as unknown as CoreMock;
  });

  afterEach(() => {
    core.http.get.mockClear();
    clearCache();
  });

  describe('_inspect', () => {
    beforeEach(() => {
      // @ts-expect-error
      core.uiSettings.get = () => true; // enable `observability:enableInspectEsQueries` setting
    });

    it('should add debug param for APM endpoints', async () => {
      await callApi(core, { pathname: `/internal/apm/status/server` });

      expect(core.http.get).toHaveBeenCalledWith(
        '/internal/apm/status/server',
        {
          query: { _inspect: true },
        }
      );
    });

    it('should not add debug param for non-APM endpoints', async () => {
      await callApi(core, { pathname: `/api/kibana` });

      expect(core.http.get).toHaveBeenCalledWith('/api/kibana', { query: {} });
    });
  });

  describe('cache', () => {
    let nowSpy: jest.SpyInstance;
    beforeEach(() => {
      nowSpy = mockNow('2019');
    });

    beforeEach(() => {
      nowSpy.mockRestore();
    });

    describe('when the call does not contain start/end params', () => {
      it('should not return cached response for identical calls', async () => {
        await callApi(core, { pathname: `/api/kibana`, query: { foo: 'bar' } });
        await callApi(core, { pathname: `/api/kibana`, query: { foo: 'bar' } });
        await callApi(core, { pathname: `/api/kibana`, query: { foo: 'bar' } });

        expect(core.http.get).toHaveBeenCalledTimes(3);
      });
    });

    describe('when the call contains start/end params', () => {
      it('should return cached response for identical calls', async () => {
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' },
        });

        expect(core.http.get).toHaveBeenCalledTimes(1);
      });

      it('should not return cached response for subsequent calls if arguments change', async () => {
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar1' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar2' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011', foo: 'bar3' },
        });

        expect(core.http.get).toHaveBeenCalledTimes(3);
      });

      it('should not return cached response if `end` is a future timestamp', async () => {
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { end: '2030' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { end: '2030' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { end: '2030' },
        });

        expect(core.http.get).toHaveBeenCalledTimes(3);
      });

      it('should return cached response if calls contain `end` param in the past', async () => {
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' },
        });

        expect(core.http.get).toHaveBeenCalledTimes(1);
      });

      it('should return cached response even if order of properties change', async () => {
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { end: '2010', start: '2009' },
        });
        await callApi(core, {
          pathname: `/api/kibana`,
          query: { start: '2009', end: '2010' },
        });
        await callApi(core, {
          query: { start: '2009', end: '2010' },
          pathname: `/api/kibana`,
        });

        expect(core.http.get).toHaveBeenCalledTimes(1);
      });

      it('should not return cached response with `isCachable: false` option', async () => {
        await callApi(core, {
          isCachable: false,
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' },
        });
        await callApi(core, {
          isCachable: false,
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' },
        });
        await callApi(core, {
          isCachable: false,
          pathname: `/api/kibana`,
          query: { start: '2010', end: '2011' },
        });

        expect(core.http.get).toHaveBeenCalledTimes(3);
      });

      it('should return cached response with `isCachable: true` option', async () => {
        await callApi(core, {
          isCachable: true,
          pathname: `/api/kibana`,
          query: { end: '2030' },
        });
        await callApi(core, {
          isCachable: true,
          pathname: `/api/kibana`,
          query: { end: '2030' },
        });
        await callApi(core, {
          isCachable: true,
          pathname: `/api/kibana`,
          query: { end: '2030' },
        });

        expect(core.http.get).toHaveBeenCalledTimes(1);
      });
    });
  });
});
