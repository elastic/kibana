/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useFindLists } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { getFoundListSchemaMock } from '../../../common/schemas/response/found_list_schema.mock';

jest.mock('@kbn/securitysolution-list-api');

// TODO: Move this test to the package of: kbn-securitysolution-list-hooks/src/use_find_lists/index.test.ts once kbn mocks such as httpServiceMock are figured out
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
