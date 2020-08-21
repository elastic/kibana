/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  INGEST_API_EPM_PACKAGES,
  sendGetPackagePolicy,
  sendGetEndpointSecurityPackage,
  sendGetEndpointSpecificPackagePolicies,
} from './ingest';
import { httpServiceMock } from '../../../../../../../../../../src/core/public/mocks';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../../../../../ingest_manager/common';
import { policyListApiPathHandlers } from '../test_mock_utils';

describe('ingest service', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    http = httpServiceMock.createStartContract();
  });

  describe('sendGetEndpointSpecificPackagePolicies()', () => {
    it('auto adds kuery to api request', async () => {
      await sendGetEndpointSpecificPackagePolicies(http);
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/package_policies', {
        query: {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: endpoint`,
        },
      });
    });
    it('supports additional KQL to be defined on input for query params', async () => {
      await sendGetEndpointSpecificPackagePolicies(http, {
        query: { kuery: 'someValueHere', page: 1, perPage: 10 },
      });
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/package_policies', {
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
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/package_policies/123', undefined);
    });
    it('supports http options', async () => {
      await sendGetPackagePolicy(http, '123', { query: { page: 1 } });
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/package_policies/123', {
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
      expect(http.get).toHaveBeenCalledWith('/api/ingest_manager/epm/packages', {
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
