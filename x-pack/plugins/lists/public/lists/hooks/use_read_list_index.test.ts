/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import * as Api from '../api';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { getAcknowledgeSchemaResponseMock } from '../../../common/schemas/response/acknowledge_schema.mock';

import { useReadListIndex } from './use_read_list_index';

jest.mock('../api');

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
