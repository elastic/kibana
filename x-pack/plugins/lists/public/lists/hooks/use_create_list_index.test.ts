/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useCreateListIndex } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { getAcknowledgeSchemaResponseMock } from '../../../common/schemas/response/acknowledge_schema.mock';
import { createQueryWrapperMock } from '../mocks/query_wrapper';

jest.mock('@kbn/securitysolution-list-api');

// TODO: This test should be ported to the package: packages/kbn-securitysolution-list-hooks/src/use_create_list_index/index.test.ts once we have mocks in kbn packages

const { wrapper: queryWrapper, queryClient } = createQueryWrapperMock();

describe('useCreateListIndex', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.createListIndex as jest.Mock).mockResolvedValue(getAcknowledgeSchemaResponseMock());
  });

  it('should call Api.createListIndex when start() executes', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCreateListIndex({ http: httpMock }), {
      wrapper: queryWrapper,
    });
    act(() => {
      result.current.start();
    });
    await waitForNextUpdate();

    expect(Api.createListIndex).toHaveBeenCalledWith(expect.objectContaining({ http: httpMock }));
  });

  it('should call onError callback when Api.createListIndex fails', async () => {
    const onError = jest.fn();
    jest.spyOn(Api, 'createListIndex').mockRejectedValue(new Error('Mocked error'));

    const { result, waitForNextUpdate } = renderHook(
      () => useCreateListIndex({ http: httpMock, onError }),
      { wrapper: queryWrapper }
    );

    act(() => {
      result.current.start();
    });
    await waitForNextUpdate();

    expect(onError).toHaveBeenCalledWith(new Error('Mocked error'), undefined, undefined);
  });

  it('should not invalidate read index query on failure', async () => {
    jest.spyOn(Api, 'createListIndex').mockRejectedValue(new Error('Mocked error'));
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result, waitForNextUpdate } = renderHook(() => useCreateListIndex({ http: httpMock }), {
      wrapper: queryWrapper,
    });

    act(() => {
      result.current.start();
    });
    await waitForNextUpdate();

    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });

  it('should invalidate read index query on success', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCreateListIndex({ http: httpMock }), {
      wrapper: queryWrapper,
    });
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    act(() => {
      result.current.start();
    });
    await waitForNextUpdate();

    expect(invalidateQueriesSpy).toHaveBeenCalledWith(['detectionEngine', 'listIndex']);
  });
});
