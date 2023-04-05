/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import * as api from './api';
import { basicCaseId, basicFileMock } from './mock';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';
import { useDeleteFileAttachment } from './use_delete_file_attachment';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

const successToasterTitle = 'Deleted';

describe('useDeleteFileAttachment', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toBeTruthy();
  });

  it('calls deleteFileAttachment with correct arguments - case', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');

    const { waitForNextUpdate, result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
        successToasterTitle,
      });
    });

    await waitForNextUpdate();

    expect(spyOnDeleteFileAttachments).toHaveBeenCalledWith({
      caseId: basicCaseId,
      fileIds: [basicFileMock.id],
      signal: expect.any(AbortSignal),
    });
  });

  it('refreshes the case page view', async () => {
    const { waitForNextUpdate, result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
        successToasterTitle,
      })
    );

    await waitForNextUpdate();

    expect(useRefreshCaseViewPage()).toBeCalled();
  });

  it('shows a success toaster correctly', async () => {
    const { waitForNextUpdate, result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
        successToasterTitle,
      })
    );

    await waitForNextUpdate();

    expect(addSuccess).toHaveBeenCalledWith({
      title: successToasterTitle,
      className: 'eui-textBreakWord',
    });
  });

  it('sets isError when fails to delete a file attachment', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');
    spyOnDeleteFileAttachments.mockRejectedValue(new Error('Error'));

    const { waitForNextUpdate, result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
        successToasterTitle,
      })
    );

    await waitForNextUpdate();

    expect(spyOnDeleteFileAttachments).toBeCalledWith({
      caseId: basicCaseId,
      fileIds: [basicFileMock.id],
      signal: expect.any(AbortSignal),
    });

    expect(addError).toHaveBeenCalled();
    expect(result.current.isError).toBe(true);
  });
});
