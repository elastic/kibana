/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from 'src/core/public/mocks';
import {
  EPM_API_ROUTES,
  PACKAGE_POLICY_API_ROOT,
  PACKAGE_POLICY_API_ROUTES,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
} from '../../../../../fleet/common';
import {
  INGEST_API_EPM_PACKAGES,
  sendGetEndpointSecurityPackage,
  sendGetEndpointSpecificPackagePolicies,
  sendGetPackagePolicy,
} from './ingest';
import { policyListApiPathHandlers } from './test_mock_utils';

describe('ingest service', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  describe('sendGetEndpointSpecificPackagePolicies()', () => {
    it('auto adds kuery to api request', async () => {
      await sendGetEndpointSpecificPackagePolicies(http);
      expect(http.get).toHaveBeenCalledWith(`${PACKAGE_POLICY_API_ROUTES.LIST_PATTERN}`, {
        query: {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        },
      });
    });
    it('supports additional KQL to be defined on input for query params', async () => {
      await sendGetEndpointSpecificPackagePolicies(http, {
        query: { kuery: 'someValueHere', page: 1, perPage: 10 },
      });
      expect(http.get).toHaveBeenCalledWith(`${PACKAGE_POLICY_API_ROUTES.LIST_PATTERN}`, {
        query: {
          kuery: `someValueHere and ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
          perPage: 10,
          page: 1,
        },
      });
    });
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
    it('should query EPM with category=security', async () => {
      http.get.mockReturnValue(
        Promise.resolve(policyListApiPathHandlers()[INGEST_API_EPM_PACKAGES]())
      );
      await sendGetEndpointSecurityPackage(http);
      expect(http.get).toHaveBeenCalledWith(`${EPM_API_ROUTES.LIST_PATTERN}`, {
        query: { category: 'security' },
      });
    });

    it('should throw if package is not found', async () => {
      http.get.mockResolvedValue({ response: [], success: true });
      await expect(async () => {
        await sendGetEndpointSecurityPackage(http);
      }).rejects.toThrow();
    });
  });
});
