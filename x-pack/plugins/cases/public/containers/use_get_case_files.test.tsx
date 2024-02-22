/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { basicCase } from './mock';

import type { AppMockRenderer } from '../common/mock';
import { mockedTestProvidersOwner, createAppMockRenderer } from '../common/mock';
import { useToasts } from '../common/lib/kibana';
import { useGetCaseFiles } from './use_get_case_files';
import { constructFileKindIdByOwner } from '../../common/files';

jest.mock('../common/lib/kibana');

const hookParams = {
  caseId: basicCase.id,
  page: 1,
  perPage: 1,
  searchTerm: 'foobar',
};

const expectedCallParams = {
  kind: constructFileKindIdByOwner(mockedTestProvidersOwner[0]),
  page: hookParams.page + 1,
  name: `*${hookParams.searchTerm}*`,
  perPage: hookParams.perPage,
  meta: { caseIds: [hookParams.caseId] },
};

describe('useGetCaseFiles', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('shows an error toast when filesClient.list throws', async () => {
    const addError = jest.fn();
    (useToasts as jest.Mock).mockReturnValue({ addError });

    appMockRender.getFilesClient().list = jest.fn().mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    const { waitForNextUpdate } = renderHook(() => useGetCaseFiles(hookParams), {
      wrapper: appMockRender.AppWrapper,
    });
    await waitForNextUpdate();

    expect(appMockRender.getFilesClient().list).toBeCalledWith(expectedCallParams);
    expect(addError).toHaveBeenCalled();
  });

  it('calls filesClient.list with correct arguments', async () => {
    const { waitForNextUpdate } = renderHook(() => useGetCaseFiles(hookParams), {
      wrapper: appMockRender.AppWrapper,
    });

    await waitForNextUpdate();

    expect(appMockRender.getFilesClient().list).toBeCalledWith(expectedCallParams);
  });
});
