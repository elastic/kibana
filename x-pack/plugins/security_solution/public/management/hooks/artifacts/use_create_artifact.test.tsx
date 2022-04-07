/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCreateArtifact } from './use_create_artifact';
import { HttpSetup } from 'kibana/public';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import {
  getFakeListId,
  getFakeListDefinition,
  getFakeHttpService,
  renderMutation,
} from '../test_utils';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { act } from '@testing-library/react-hooks';

describe('Create artifact hook', () => {
  let result: ReturnType<typeof useCreateArtifact>;

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

  it('create an artifact', async () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };

    fakeHttpServices.post.mockClear();
    fakeHttpServices.post.mockResolvedValueOnce(exceptionItem);
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useCreateArtifact(instance, {
        retry: false,
        onSuccess: onSuccessMock,
      })
    );

    expect(fakeHttpServices.post).toHaveBeenCalledTimes(0);

    await act(async () => {
      const res = await result.mutateAsync(exceptionItem);
      expect(res).toBe(exceptionItem);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.post).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(exceptionItem),
      });
    });
  });

  it('throw when creating an artifact', async () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.post.mockClear();
    fakeHttpServices.post.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useCreateArtifact(instance, {
        onError: onErrorMock,
        retry: false,
      })
    );

    await act(async () => {
      try {
        await result.mutateAsync(exceptionItem);
      } catch (err) {
        expect(err).toBe(error);
        expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledTimes(1);
      }
    });
  });
});
