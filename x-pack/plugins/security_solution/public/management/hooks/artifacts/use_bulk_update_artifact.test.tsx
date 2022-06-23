/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBulkUpdateArtifact } from './use_bulk_update_artifact';
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

describe('Bulk update artifact hook', () => {
  let result: ReturnType<typeof useBulkUpdateArtifact>;

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

  it('Bulk update an artifact', async () => {
    const exceptionItem1 = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };
    const exceptionItem2 = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };

    fakeHttpServices.put.mockClear();
    fakeHttpServices.put.mockResolvedValueOnce(exceptionItem1);
    fakeHttpServices.put.mockResolvedValueOnce(exceptionItem2);
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useBulkUpdateArtifact(instance, {
        retry: false,
        onSuccess: onSuccessMock,
      })
    );

    expect(fakeHttpServices.put).toHaveBeenCalledTimes(0);

    await act(async () => {
      const res = await result.mutateAsync([exceptionItem1, exceptionItem2]);
      expect(res).toEqual([exceptionItem1, exceptionItem2]);
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.put).toHaveBeenCalledTimes(2);
      expect(fakeHttpServices.put).toHaveBeenNthCalledWith(1, '/api/exception_lists/items', {
        body: JSON.stringify(ExceptionsListApiClient.cleanExceptionsBeforeUpdate(exceptionItem1)),
      });
      expect(fakeHttpServices.put).toHaveBeenNthCalledWith(2, '/api/exception_lists/items', {
        body: JSON.stringify(ExceptionsListApiClient.cleanExceptionsBeforeUpdate(exceptionItem2)),
      });
    });
  });

  it('throw when bulk updating an artifact', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    const exceptionItem1 = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };
    const exceptionItem2 = { ...getExceptionListItemSchemaMock(), list_id: getFakeListId() };
    fakeHttpServices.put.mockClear();
    fakeHttpServices.put.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderMutation(() =>
      useBulkUpdateArtifact(instance, {
        onError: onErrorMock,
        retry: false,
      })
    );

    await act(async () => {
      try {
        await result.mutateAsync([exceptionItem1, exceptionItem2]);
      } catch (err) {
        expect(err).toBe(error);
        expect(fakeHttpServices.put).toHaveBeenCalledTimes(2);
        expect(onErrorMock).toHaveBeenCalledTimes(1);
      }
    });
  });
});
