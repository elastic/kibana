/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as Api from '../api';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';

import { useExportList } from './use_export_list';

jest.mock('../api');

describe('useExportList', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.exportList as jest.Mock).mockResolvedValue(new Blob());
  });

  it('invokes Api.exportList', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useExportList());
    act(() => {
      result.current.start({ http: httpMock, listId: 'list' });
    });
    await waitForNextUpdate();

    expect(Api.exportList).toHaveBeenCalledWith(
      expect.objectContaining({ http: httpMock, listId: 'list' })
    );
  });
});
