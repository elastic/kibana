/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useImportList } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';

jest.mock('@kbn/securitysolution-list-api');

// TODO: Port this test over to: packages/kbn-securitysolution-list-hooks/src/use_import_list/index.ts once mocks are moved to packages

describe('useImportList', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.importList as jest.Mock).mockResolvedValue(getListResponseMock());
  });

  it('does not invoke importList if start was not called', () => {
    renderHook(() => useImportList());
    expect(Api.importList).not.toHaveBeenCalled();
  });

  it('invokes Api.importList', async () => {
    const fileMock = 'my file' as unknown as File;

    const { result, waitForNextUpdate } = renderHook(() => useImportList());

    act(() => {
      result.current.start({
        file: fileMock,
        http: httpMock,
        listId: 'my_list_id',
        type: 'keyword',
      });
    });
    await waitForNextUpdate();

    expect(Api.importList).toHaveBeenCalledWith(
      expect.objectContaining({
        file: fileMock,
        listId: 'my_list_id',
        type: 'keyword',
      })
    );
  });

  it('populates result with the response of Api.importList', async () => {
    const fileMock = 'my file' as unknown as File;

    const { result, waitForNextUpdate } = renderHook(() => useImportList());

    act(() => {
      result.current.start({
        file: fileMock,
        http: httpMock,
        listId: 'my_list_id',
        type: 'keyword',
      });
    });
    await waitForNextUpdate();

    expect(result.current.result).toEqual(getListResponseMock());
  });

  it('error is populated if importList rejects', async () => {
    const fileMock = 'my file' as unknown as File;
    (Api.importList as jest.Mock).mockRejectedValue(new Error('whoops'));
    const { result, waitForNextUpdate } = renderHook(() => useImportList());

    act(() => {
      result.current.start({
        file: fileMock,
        http: httpMock,
        listId: 'my_list_id',
        type: 'keyword',
      });
    });

    await waitForNextUpdate();

    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toEqual(new Error('whoops'));
  });
});
