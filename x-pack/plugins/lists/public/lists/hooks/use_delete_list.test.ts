/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as Api from '../api';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';

import { useDeleteList } from './use_delete_list';

jest.mock('../api');

describe('useDeleteList', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.deleteList as jest.Mock).mockResolvedValue(getListResponseMock());
  });

  it('invokes Api.deleteList', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useDeleteList());
    act(() => {
      result.current.start({ http: httpMock, id: 'list' });
    });
    await waitForNextUpdate();

    expect(Api.deleteList).toHaveBeenCalledWith(
      expect.objectContaining({ http: httpMock, id: 'list' })
    );
  });
});
