/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act, waitFor } from '@testing-library/react';

import { AttachmentType } from '../../common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import { useCreateAttachments } from './use_create_attachments';
import { basicCaseId } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';
import type { AppMockRenderer } from '../common/mock';
import { createAppMockRenderer } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const useToastMock = useToasts as jest.Mock;

describe('useCreateAttachments', () => {
  const addError = jest.fn();
  const addSuccess = jest.fn();

  useToastMock.mockReturnValue({
    addError,
    addSuccess,
  });

  const attachmentsWithoutOwner = [
    {
      comment: 'a comment',
      type: AttachmentType.user as const,
    },
  ];

  const attachmentsWithOwner = attachmentsWithoutOwner.map((attachment) => ({
    ...attachment,
    owner: SECURITY_SOLUTION_OWNER,
  }));

  const request = {
    caseId: basicCaseId,
    caseOwner: SECURITY_SOLUTION_OWNER,
    attachments: attachmentsWithoutOwner,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const spy = jest.spyOn(api, 'createAttachments');

    const { result } = renderHook(() => useCreateAttachments(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitFor(() => null);

    expect(spy).toHaveBeenCalledWith({ attachments: attachmentsWithOwner, caseId: request.caseId });
  });

  it('does not show a success toaster', async () => {
    const { result } = renderHook(() => useCreateAttachments(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitFor(() => null);

    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('shows a toast error when the api return an error', async () => {
    jest
      .spyOn(api, 'createAttachments')
      .mockRejectedValue(new Error('useCreateAttachments: Test error'));

    const { result } = renderHook(() => useCreateAttachments(), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.mutate(request);
    });

    await waitFor(() => null);

    expect(addError).toHaveBeenCalled();
  });
});
