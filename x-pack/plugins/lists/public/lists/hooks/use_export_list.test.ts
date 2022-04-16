/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useExportList } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

jest.mock('@kbn/securitysolution-list-api');

// TODO: Move this test to the kbn package: packages/kbn-securitysolution-list-hooks/src/use_export_list/index.ts once Mocks are ported from Kibana

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
