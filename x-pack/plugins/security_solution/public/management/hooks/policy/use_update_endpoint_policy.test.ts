/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation as _useMutation } from '@tanstack/react-query';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { allFleetHttpMocks } from '../../mocks';
import type {
  UseUpdateEndpointPolicyOptions,
  UseUpdateEndpointPolicyResult,
} from './use_update_endpoint_policy';
import type { RenderHookResult } from '@testing-library/react-hooks/src/types';
import { useUpdateEndpointPolicy } from './use_update_endpoint_policy';
import type { PolicyData } from '../../../../common/endpoint/types';
import { FleetPackagePolicyGenerator } from '../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { API_VERSIONS, packagePolicyRouteService } from '@kbn/fleet-plugin/common';
import { getPolicyDataForUpdate } from '../../../../common/endpoint/service/policy';

const useMutationMock = _useMutation as jest.Mock;

jest.mock('@tanstack/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@tanstack/react-query');

  return {
    ...actualReactQueryModule,
    useMutation: jest.fn((...args) => actualReactQueryModule.useMutation(...args)),
  };
});

describe('When using the `useFetchEndpointPolicyAgentSummary()` hook', () => {
  let customOptions: UseUpdateEndpointPolicyOptions;
  let http: AppContextTestRender['coreStart']['http'];
  let apiMocks: ReturnType<typeof allFleetHttpMocks>;
  let policy: PolicyData;
  let renderHook: () => RenderHookResult<
    UseUpdateEndpointPolicyOptions,
    UseUpdateEndpointPolicyResult
  >;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    http = testContext.coreStart.http;
    apiMocks = allFleetHttpMocks(http);
    policy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy();
    customOptions = {};
    renderHook = () => {
      return testContext.renderHook(() => useUpdateEndpointPolicy(customOptions));
    };
  });

  it('should send expected update payload', async () => {
    const {
      result: {
        current: { mutateAsync },
      },
    } = renderHook();
    const result = await mutateAsync({ policy });

    expect(apiMocks.responseProvider.updateEndpointPolicy).toHaveBeenCalledWith({
      path: packagePolicyRouteService.getUpdatePath(policy.id),
      body: JSON.stringify(getPolicyDataForUpdate(policy)),
      version: API_VERSIONS.public.v1,
    });

    expect(result).toEqual({ item: expect.any(Object) });
  });

  it('should allow custom options to be passed to ReactQuery', async () => {
    customOptions.mutationKey = ['abc-123'];
    customOptions.cacheTime = 10;
    renderHook();

    expect(useMutationMock).toHaveBeenCalledWith(expect.any(Function), customOptions);
  });
});
