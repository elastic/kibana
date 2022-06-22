/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUpdateArtifact } from './use_update_artifact';
import { HttpSetup } from '@kbn/core/public';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import {
  getFakeListId,
  getFakeListDefinition,
  getFakeHttpService,
  renderMutation,
} from '../test_utils';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { act } from '@testing-library/react-hooks';

describe('Update artifact hook', () => {
  let result: ReturnType<typeof useUpdateArtifact>;

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

  it('update an artifact', async () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };

    fakeHttpServices.put.mockClear();
    fakeHttpServices.put.mockResolvedValueOnce(exceptionItem);
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useUpdateArtifact(instance, {
        retry: false,
        onSuccess: onSuccessMock,
      })
    );

    expect(fakeHttpServices.put).toHaveBeenCalledTimes(0);

    await act(async () => {
      const res = await result.mutateAsync(exceptionItem);
      expect(res).toBe(exceptionItem);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.put).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.put).toHaveBeenCalledWith('/api/exception_lists/items', {
        body: JSON.stringify(ExceptionsListApiClient.cleanExceptionsBeforeUpdate(exceptionItem)),
      });
    });
  });

  it('throw when updating an artifact', async () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.put.mockClear();
    fakeHttpServices.put.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useUpdateArtifact(instance, {
        onError: onErrorMock,
        retry: false,
      })
    );

    await act(async () => {
      try {
        await result.mutateAsync(exceptionItem);
      } catch (err) {
        expect(err).toBe(error);
        expect(fakeHttpServices.put).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledTimes(1);
      }
    });
  });
});
