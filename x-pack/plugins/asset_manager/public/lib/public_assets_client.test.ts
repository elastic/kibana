/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetupMock } from '@kbn/core-http-browser-mocks';
import { coreMock } from '@kbn/core/public/mocks';
import { PublicAssetsClient } from './public_assets_client';
import * as routePaths from '../../common/constants_routes';

describe('Public assets client', () => {
  let http: HttpSetupMock = coreMock.createSetup().http;

  beforeEach(() => {
    http = coreMock.createSetup().http;
  });

  describe('class instantiation', () => {
    it('should successfully instantiate', () => {
      new PublicAssetsClient(http);
    });
  });

  describe('getHosts', () => {
    it('should call the REST API', async () => {
      const client = new PublicAssetsClient(http);
      await client.getHosts({ from: 'x', to: 'y' });
      expect(http.get).toBeCalledTimes(1);
    });

    it('should include specified "from" and "to" parameters in http.get query', async () => {
      const client = new PublicAssetsClient(http);
      await client.getHosts({ from: 'x', to: 'y' });
      expect(http.get).toBeCalledWith(routePaths.GET_HOSTS, {
        query: { from: 'x', to: 'y' },
      });
    });

    it('should return the direct results of http.get', async () => {
      const client = new PublicAssetsClient(http);
      http.get.mockResolvedValueOnce('my result');
      const result = await client.getHosts({ from: 'x', to: 'y' });
      expect(result).toBe('my result');
    });
  });
});
