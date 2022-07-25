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

jest.mock('@kbn/securitysolution-list-api');

// TODO: This test should be ported to the package: packages/kbn-securitysolution-list-hooks/src/use_create_list_index/index.test.ts once we have mocks in kbn packages

describe('useCreateListIndex', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.createListIndex as jest.Mock).mockResolvedValue(getAcknowledgeSchemaResponseMock());
  });

  it('invokes Api.createListIndex', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useCreateListIndex());
    act(() => {
      result.current.start({ http: httpMock });
    });
    await waitForNextUpdate();

    expect(Api.createListIndex).toHaveBeenCalledWith(expect.objectContaining({ http: httpMock }));
  });
});
