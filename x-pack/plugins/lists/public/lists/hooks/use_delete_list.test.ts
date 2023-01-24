/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useDeleteList } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';

jest.mock('@kbn/securitysolution-list-api');

// TODO: This test should be ported to the package: packages/kbn-securitysolution-list-hooks/src/use_delete_list/index.test.ts once we have mocks in kbn packages

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
