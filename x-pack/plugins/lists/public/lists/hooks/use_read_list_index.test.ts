/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useReadListIndex } from '@kbn/securitysolution-list-hooks';
import * as Api from '@kbn/securitysolution-list-api';
import { httpServiceMock } from '@kbn/core/public/mocks';

import { getAcknowledgeSchemaResponseMock } from '../../../common/schemas/response/acknowledge_schema.mock';
import { createQueryWrapperMock } from '../mocks/query_wrapper';

jest.mock('@kbn/securitysolution-list-api');

const { wrapper: queryWrapper } = createQueryWrapperMock();

// TODO: Port this code over to the package: packages/kbn-securitysolution-list-hooks/src/use_read_list_index/index.test.ts once kibana has mocks in packages

// FLAKY: https://github.com/elastic/kibana/issues/178026
describe.skip('useReadListIndex', () => {
  let httpMock: ReturnType<typeof httpServiceMock.createStartContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createStartContract();
    (Api.readListIndex as jest.Mock).mockResolvedValue(getAcknowledgeSchemaResponseMock());
    jest.resetAllMocks();
  });

  it('should call Api.readListIndex when is enabled', async () => {
    const { waitForNextUpdate } = renderHook(
      () => useReadListIndex({ http: httpMock, isEnabled: true }),
      {
        wrapper: queryWrapper,
      }
    );

    await waitForNextUpdate();

    expect(Api.readListIndex).toHaveBeenCalled();
  });

  it('should not call Api.readListIndex when is not enabled', async () => {
    renderHook(() => useReadListIndex({ http: httpMock, isEnabled: false }), {
      wrapper: queryWrapper,
    });

    expect(Api.readListIndex).not.toHaveBeenCalled();
  });

  it('calls onError callback when apiCall fails', async () => {
    const onError = jest.fn();
    jest.spyOn(Api, 'readListIndex').mockRejectedValue(new Error('Mocked error'));

    const { waitForNextUpdate } = renderHook(
      () => useReadListIndex({ http: httpMock, isEnabled: true, onError }),
      {
        wrapper: queryWrapper,
      }
    );

    await waitForNextUpdate();

    expect(onError).toHaveBeenCalledWith(new Error('Mocked error'));
  });
});
