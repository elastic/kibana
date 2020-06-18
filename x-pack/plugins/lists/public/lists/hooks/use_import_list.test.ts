/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import * as Api from '../api';

import { useImportList } from './use_import_list';

jest.mock('../api');

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
    const fileMock = ('my file' as unknown) as File;

    const { result } = renderHook(() => useImportList());

    await act(() =>
      result.current.start({
        file: fileMock,
        http: httpMock,
        listId: 'my_list_id',
        type: 'keyword',
      })
    );

    expect(Api.importList).toHaveBeenCalledWith(
      expect.objectContaining({
        file: fileMock,
        listId: 'my_list_id',
        type: 'keyword',
      })
    );
  });

  it('populates result with the response of Api.importList', async () => {
    const fileMock = ('my file' as unknown) as File;

    const { result } = renderHook(() => useImportList());

    await act(() =>
      result.current.start({
        file: fileMock,
        http: httpMock,
        listId: 'my_list_id',
        type: 'keyword',
      })
    );

    expect(result.current.result).toEqual(getListResponseMock());
  });

  it('start rejects and error is populated if importList rejects', async () => {
    expect.assertions(3);
    const fileMock = ('my file' as unknown) as File;
    (Api.importList as jest.Mock).mockRejectedValue(new Error('whoops'));
    const { result } = renderHook(() => useImportList());

    await act(() =>
      result.current
        .start({
          file: fileMock,
          http: httpMock,
          listId: 'my_list_id',
          type: 'keyword',
        })
        .catch((e) => expect(e).toEqual(new Error('whoops')))
    );

    expect(result.current.result).toBeUndefined();
    expect(result.current.error).toEqual(new Error('whoops'));
  });
});
