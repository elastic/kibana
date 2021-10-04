/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  httpHandlerMockFactory,
  ResponseProvidersInterface,
} from '../../../../common/mock/endpoint/http_handler_mock_factory';
import {
  GetTrustedAppsListRequest,
  GetTrustedAppsListResponse,
} from '../../../../../common/endpoint/types';
import { TRUSTED_APPS_LIST_API } from '../../../../../common/endpoint/constants';
import { TrustedAppGenerator } from '../../../../../common/endpoint/data_generators/trusted_app_generator';

type PolicyDetailsTrustedAppsHttpMocksInterface = ResponseProvidersInterface<{
  policyTrustedAppsList: () => GetTrustedAppsListResponse;
}>;

/**
 * HTTP mocks that support the Trusted Apps tab of the Policy Details page
 */
export const policyDetailsTrustedAppsHttpMocks =
  httpHandlerMockFactory<PolicyDetailsTrustedAppsHttpMocksInterface>([
    {
      id: 'policyTrustedAppsList',
      path: TRUSTED_APPS_LIST_API,
      method: 'post',
      handler: ({ query }): GetTrustedAppsListResponse => {
        const apiQueryParams = query as GetTrustedAppsListRequest;
        const generator = new TrustedAppGenerator('seed');

        return {
          page: apiQueryParams.page ?? 1,
          per_page: apiQueryParams.per_page ?? 10,
          total: 1,
          data: [generator.generate()],
        };
      },
    },
  ]);
