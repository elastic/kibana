/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as Api from '../api';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { getFoundListSchemaMock } from '../../../common/schemas/response/found_list_schema.mock';

import { useFindLists } from './use_find_lists';

jest.mock('../api');

describe('useFindLists', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.findLists as jest.Mock).mockResolvedValue(getFoundListSchemaMock());
  });

  it('invokes Api.findLists', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useFindLists());
    act(() => {
      result.current.start({ http: httpMock, pageIndex: 1, pageSize: 10 });
    });
    await waitForNextUpdate();

    expect(Api.findLists).toHaveBeenCalledWith(
      expect.objectContaining({ http: httpMock, pageIndex: 1, pageSize: 10 })
    );
  });
});
