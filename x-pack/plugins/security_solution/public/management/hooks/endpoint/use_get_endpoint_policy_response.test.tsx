/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetEndpointPolicyResponse } from './use_get_endpoint_policy_response';
import type { HttpSetup } from '@kbn/core/public';
import { useHttp } from '../../../common/lib/kibana';
import { getFakeHttpService, renderQuery } from '../test_utils';
import { EndpointDocGenerator } from '../../../../common/endpoint/generate_data';
import { BASE_POLICY_RESPONSE_ROUTE } from '../../../../common/endpoint/constants';

jest.mock('../../../common/lib/kibana');

describe('Get endpoint policy response hook', () => {
  let result: ReturnType<typeof useGetEndpointPolicyResponse>;
  const useGetEndpointPolicyResponseMock = useHttp as jest.Mock;
  let fakeHttpServices: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    fakeHttpServices = getFakeHttpService();
  });

  it('get endpoint policy response', async () => {
    const generator: EndpointDocGenerator = new EndpointDocGenerator();
    const policyResponse = generator.generatePolicyResponse();

    useGetEndpointPolicyResponseMock.mockImplementation(() => fakeHttpServices);
    fakeHttpServices.get.mockResolvedValueOnce(policyResponse);

    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderQuery(
      () =>
        useGetEndpointPolicyResponse('fakeId', {
          onSuccess: onSuccessMock,
          retry: false,
        }),
      'isSuccess'
    );

    expect(result.data).toBe(policyResponse);
    expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
    expect(fakeHttpServices.get).toHaveBeenCalledWith(BASE_POLICY_RESPONSE_ROUTE, {
      query: { agentId: 'fakeId' },
    });
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('throw when getting endpoint policy response', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.get.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderQuery(
      () =>
        useGetEndpointPolicyResponse('fakeId', {
          onError: onErrorMock,
          retry: false,
        }),
      'isError'
    );

    expect(result.error).toBe(error);
    expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledTimes(1);
  });
});
