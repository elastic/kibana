/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetArtifact } from './use_get_artifact';
import { HttpSetup } from 'kibana/public';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import {
  getFakeListId,
  getFakeListDefinition,
  getFakeHttpService,
  renderQuery,
} from '../test_utils';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

describe('Get artifact hook', () => {
  let result: ReturnType<typeof useGetArtifact>;

  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let instance: ExceptionsListApiClient;

  beforeEach(() => {
    fakeHttpServices = getFakeHttpService();
    instance = new ExceptionsListApiClient(
      fakeHttpServices,
      getFakeListId(),
      getFakeListDefinition()
    );
  });

  it('get an artifact', async () => {
    const apiResponse = getExceptionListItemSchemaMock();
    fakeHttpServices.get.mockResolvedValueOnce(apiResponse);

    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderQuery(
      () =>
        useGetArtifact(instance, 'fakeId', undefined, {
          onSuccess: onSuccessMock,
          retry: false,
        }),
      'isSuccess'
    );

    expect(result.data).toBe(apiResponse);
    expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
    expect(fakeHttpServices.get).toHaveBeenCalledWith('/api/exception_lists/items', {
      query: {
        item_id: 'fakeId',
        namespace_type: 'agnostic',
      },
    });
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('throw when getting an artifact', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.get.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderQuery(
      () =>
        useGetArtifact(instance, undefined, 'fakeId', {
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
