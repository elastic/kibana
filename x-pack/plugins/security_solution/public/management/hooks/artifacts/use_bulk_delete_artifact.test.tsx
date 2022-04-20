/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBulkDeleteArtifact } from './use_bulk_delete_artifact';
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

describe('Bulk delete artifact hook', () => {
  let result: ReturnType<typeof useBulkDeleteArtifact>;

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

  it('Bulk delete an artifact', async () => {
    const exceptionItem1 = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };
    const exceptionItem2 = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };

    fakeHttpServices.delete.mockClear();
    fakeHttpServices.delete.mockResolvedValueOnce(exceptionItem1);
    fakeHttpServices.delete.mockResolvedValueOnce(exceptionItem2);
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useBulkDeleteArtifact(instance, {
        retry: false,
        onSuccess: onSuccessMock,
      })
    );

    expect(fakeHttpServices.delete).toHaveBeenCalledTimes(0);

    await act(async () => {
      const res = await result.mutateAsync([{ id: 'fakeId-1' }, { itemId: 'fakeId-2' }]);
      expect(res).toEqual([exceptionItem1, exceptionItem2]);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.delete).toHaveBeenCalledTimes(2);
      expect(fakeHttpServices.delete).toHaveBeenNthCalledWith(1, '/api/exception_lists/items', {
        query: {
          id: 'fakeId-1',
          item_id: undefined,
          namespace_type: 'agnostic',
        },
      });
      expect(fakeHttpServices.delete).toHaveBeenNthCalledWith(2, '/api/exception_lists/items', {
        query: {
          id: undefined,
          item_id: 'fakeId-2',
          namespace_type: 'agnostic',
        },
      });
    });
  });

  it('throw when bulk deleting an artifact', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.delete.mockClear();
    fakeHttpServices.delete.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useBulkDeleteArtifact(instance, {
        onError: onErrorMock,
        retry: false,
      })
    );

    await act(async () => {
      try {
        await result.mutateAsync([{ id: 'fakeId-1' }, { id: 'fakeId-2' }]);
      } catch (err) {
        expect(err).toBe(error);
        expect(fakeHttpServices.delete).toHaveBeenCalledTimes(2);
        expect(onErrorMock).toHaveBeenCalledTimes(1);
      }
    });
  });
});
