/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useDeleteArtifact } from './use_delete_artifact';
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

describe('Delete artifact hook', () => {
  let result: ReturnType<typeof useDeleteArtifact>;

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

  it('delete an artifact', async () => {
    const exceptionItem = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };

    fakeHttpServices.delete.mockClear();
    fakeHttpServices.delete.mockResolvedValueOnce(exceptionItem);
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useDeleteArtifact(instance, {
        retry: false,
        onSuccess: onSuccessMock,
      })
    );

    expect(fakeHttpServices.delete).toHaveBeenCalledTimes(0);

    await act(async () => {
      const res = await result.mutateAsync({ id: 'fakeId' });
      expect(res).toBe(exceptionItem);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.delete).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.delete).toHaveBeenCalledWith('/api/exception_lists/items', {
        query: {
          id: 'fakeId',
          namespace_type: 'agnostic',
        },
      });
    });
  });

  it('throw when deleting an artifact', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.delete.mockClear();
    fakeHttpServices.delete.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useDeleteArtifact(instance, {
        onError: onErrorMock,
        retry: false,
      })
    );

    await act(async () => {
      try {
        await result.mutateAsync({ itemId: 'fakeId' });
      } catch (err) {
        expect(err).toBe(error);
        expect(fakeHttpServices.delete).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledTimes(1);
      }
    });
  });
});
