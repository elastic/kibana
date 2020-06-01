/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpStart } from 'kibana/public';
import { INGEST_API_DATASOURCES } from './services/ingest';
import { EndpointDocGenerator } from '../../../../../../common/endpoint/generate_data';
import { GetPolicyListResponse } from '../../types';

const generator = new EndpointDocGenerator('policy-list');

/**
 * It sets the mock implementation on the necessary http methods to support the policy list view
 * @param mockedHttpService
 * @param responseItems
 */
export const setPolicyListApiMockImplementation = (
  mockedHttpService: jest.Mocked<HttpStart>,
  responseItems: GetPolicyListResponse['items'] = [generator.generatePolicyDatasource()]
): void => {
  mockedHttpService.get.mockImplementation((...args) => {
    const [path] = args;
    if (typeof path === 'string') {
      if (path === INGEST_API_DATASOURCES) {
        return Promise.resolve<GetPolicyListResponse>({
          items: responseItems,
          total: 10,
          page: 1,
          perPage: 10,
          success: true,
        });
      }
    }
    return Promise.reject(new Error(`MOCK: unknown policy list api: ${path}`));
  });
};
