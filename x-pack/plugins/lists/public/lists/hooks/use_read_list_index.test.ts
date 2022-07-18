/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { useReadListIndex } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { getAcknowledgeSchemaResponseMock } from '../../../common/schemas/response/acknowledge_schema.mock';

jest.mock('@kbn/securitysolution-list-api');

// TODO: Port this code over to the package: packages/kbn-securitysolution-list-hooks/src/use_read_list_index/index.test.ts once kibana has mocks in packages

describe('useReadListIndex', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.readListIndex as jest.Mock).mockResolvedValue(getAcknowledgeSchemaResponseMock());
  });

  it('invokes Api.readListIndex', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useReadListIndex());
    act(() => {
      result.current.start({ http: httpMock });
    });
    await waitForNextUpdate();

    expect(Api.readListIndex).toHaveBeenCalledWith(expect.objectContaining({ http: httpMock }));
  });
});
