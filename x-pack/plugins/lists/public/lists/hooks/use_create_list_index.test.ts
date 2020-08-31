/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as Api from '../api';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { getAcknowledgeSchemaResponseMock } from '../../../common/schemas/response/acknowledge_schema.mock';

import { useCreateListIndex } from './use_create_list_index';

jest.mock('../api');

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
