/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendGetPackagePolicy, sendGetEndpointSecurityPackage } from './ingest';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { PACKAGE_POLICY_API_ROOT, epmRouteService } from '@kbn/fleet-plugin/common';
import { policyListApiPathHandlers } from '../../pages/policy/store/test_mock_utils';

describe('ingest service', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  describe('sendGetPackagePolicy()', () => {
    it('builds correct API path', async () => {
      await sendGetPackagePolicy(http, '123');
      expect(http.get).toHaveBeenCalledWith(`${PACKAGE_POLICY_API_ROOT}/123`, undefined);
    });
    it('supports http options', async () => {
      await sendGetPackagePolicy(http, '123', { query: { page: 1 } });
      expect(http.get).toHaveBeenCalledWith(`${PACKAGE_POLICY_API_ROOT}/123`, {
        query: {
          page: 1,
        },
      });
    });
  });

  describe('sendGetEndpointSecurityPackage()', () => {
    it('should query for endpoint package', async () => {
      const path = epmRouteService.getInfoPath('endpoint');
      http.get.mockReturnValue(Promise.resolve(policyListApiPathHandlers()[path]()));
      await sendGetEndpointSecurityPackage(http);
      expect(http.get).toHaveBeenCalledWith(path);
    });

    it('should throw if package is not found', async () => {
      http.get.mockResolvedValue({ response: [], success: true });
      await expect(async () => {
        await sendGetEndpointSecurityPackage(http);
      }).rejects.toThrow();
    });
  });
});
