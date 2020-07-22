/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { INGEST_API_PACKAGE_CONFIGS, INGEST_API_EPM_PACKAGES } from './services/ingest';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { GetPolicyListResponse } from '../../types';
import { GetPackagesResponse } from '../../../../../../../ingest_manager/common';

const generator = new EndpointDocGenerator('policy-list');

/**
 * a list of API paths response mock providers
 */
export const apiPathMockResponseProviders = {
  [INGEST_API_EPM_PACKAGES]: () =>
    Promise.resolve<GetPackagesResponse>({
      response: [generator.generateEpmPackage()],
      success: true,
    }),
};

/**
 * It sets the mock implementation on the necessary http methods to support the policy list view
 * @param mockedHttpService
 * @param responseItems
 */
export const setPolicyListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>,
  responseItems: GetPolicyListResponse['items'] = [generator.generatePolicyPackageConfig()]
): void => {
  mockedHttpService.get.mockImplementation((...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (path === INGEST_API_PACKAGE_CONFIGS) {
        return Promise.resolve<GetPolicyListResponse>({
          items: responseItems,
          total: 10,
          page: 1,
          perPage: 10,
          success: true,
        });
      }

      if (apiPathMockResponseProviders[path]) {
        return apiPathMockResponseProviders[path]();
      }
    }
    return Promise.reject(new Error(`MOCK: unknown policy list api: ${path}`));
  });
};
