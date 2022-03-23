/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useListArtifact } from './use_list_artifact';
import { HttpSetup } from 'kibana/public';
import { ExceptionsListApiClient } from '../../services/exceptions_list/exceptions_list_api_client';
import { getFoundExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';
import {
  getFakeListId,
  getFakeListDefinition,
  getFakeHttpService,
  renderQuery,
} from './test_utils';

describe('List artifact hook', () => {
  let result: ReturnType<typeof useListArtifact>;
  let searchableFields: string[];
  let options:
    | {
        filter: string;
        page: number;
        perPage: number;
        policies: string[];
      }
    | undefined;

  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let instance: ExceptionsListApiClient;

  beforeEach(() => {
    fakeHttpServices = getFakeHttpService();
    instance = new ExceptionsListApiClient(
      fakeHttpServices,
      getFakeListId(),
      getFakeListDefinition()
    );
    options = undefined;
    searchableFields = [];
  });

  it('get a list of exceptions', async () => {
    const apiResponse = getFoundExceptionListItemSchemaMock(10);
    fakeHttpServices.get.mockResolvedValueOnce(apiResponse);
    options = {
      filter: 'test',
      page: 2,
      perPage: 20,
      policies: ['policy-1', 'all'],
    };
    searchableFields = ['field-1', 'field-1.field-2', 'field-2'];
    const onSuccessMock: jest.Mock = jest.fn();

    result = await renderQuery(
      () =>
        useListArtifact(instance, options, searchableFields, {
          onSuccess: onSuccessMock,
          retry: false,
        }),
      'isSuccess'
    );

    expect(result.data).toBe(apiResponse);
    expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
    expect(fakeHttpServices.get).toHaveBeenCalledWith('/api/exception_lists/items/_find', {
      query: {
        filter:
          '((exception-list-agnostic.attributes.tags:"policy:policy-1" OR exception-list-agnostic.attributes.tags:"policy:all")) AND ((exception-list-agnostic.attributes.field-1:(*test*) OR exception-list-agnostic.attributes.field-1.field-2:(*test*) OR exception-list-agnostic.attributes.field-2:(*test*)))',
        list_id: ['FAKE_LIST_ID'],
        namespace_type: ['agnostic'],
        page: 2,
        per_page: 20,
        sort_field: undefined,
        sort_order: undefined,
      },
    });
    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('throw when getting a list of exceptions', async () => {
    const error = {
      response: {
        status: 500,
      },
    };
    fakeHttpServices.get.mockRejectedValue(error);

    const onErrorMock: jest.Mock = jest.fn();

    result = await renderQuery(
      () =>
        useListArtifact(instance, options, searchableFields, {
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
