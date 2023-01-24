/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { CommentType } from '../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../common/constants';
import type { UseCreateAttachments } from './use_create_attachments';
import { useCreateAttachments } from './use_create_attachments';
import { basicCaseId } from './mock';
import * as api from './api';
import { useToasts } from '../common/lib/kibana';

jest.mock('./api');
jest.mock('../common/lib/kibana');

const useToastMock = useToasts as jest.Mock;

describe('useCreateAttachments', () => {
  const toastErrorMock = jest.fn();
  useToastMock.mockReturnValue({
    addError: toastErrorMock,
  });

  const abortCtrl = new AbortController();
  const attachmentsWithoutOwner = [
    {
      comment: 'a comment',
      type: CommentType.user as const,
    },
  ];

  const attachmentsWithOwner = attachmentsWithoutOwner.map((attachment) => ({
    ...attachment,
    owner: SECURITY_SOLUTION_OWNER,
  }));

  const updateCaseCallback = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('init', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );
      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        createAttachments: result.current.createAttachments,
      });
    });
  });

  it('calls createAttachments with data not as an array', async () => {
    const spyOnBulkCreateAttachments = jest.spyOn(api, 'createAttachments');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );
      await waitForNextUpdate();

      result.current.createAttachments({
        caseId: basicCaseId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        data: attachmentsWithoutOwner,
        updateCase: updateCaseCallback,
      });

      await waitForNextUpdate();
      expect(spyOnBulkCreateAttachments).toBeCalledWith(
        attachmentsWithOwner,
        basicCaseId,
        abortCtrl.signal
      );
      expect(toastErrorMock).not.toHaveBeenCalled();
    });
  });

  it('calls createAttachments with data as an array', async () => {
    const spyOnBulkCreateAttachments = jest.spyOn(api, 'createAttachments');

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );
      await waitForNextUpdate();

      result.current.createAttachments({
        caseId: basicCaseId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        data: attachmentsWithoutOwner,
        updateCase: updateCaseCallback,
      });

      await waitForNextUpdate();
      expect(spyOnBulkCreateAttachments).toBeCalledWith(
        attachmentsWithOwner,
        basicCaseId,
        abortCtrl.signal
      );
      expect(toastErrorMock).not.toHaveBeenCalled();
    });
  });

  it('post case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );

      await waitForNextUpdate();
      result.current.createAttachments({
        caseId: basicCaseId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        data: attachmentsWithoutOwner,
        updateCase: updateCaseCallback,
      });

      await waitForNextUpdate();
      expect(result.current).toEqual({
        isLoading: false,
        isError: false,
        createAttachments: result.current.createAttachments,
      });
    });
  });

  it('set isLoading to true when posting case', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );

      await waitForNextUpdate();
      result.current.createAttachments({
        caseId: basicCaseId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        data: attachmentsWithoutOwner,
        updateCase: updateCaseCallback,
      });

      expect(result.current.isLoading).toBe(true);
    });
  });

  it('set isError true and shows a toast error when an error occurs', async () => {
    const spyOnBulkCreateAttachments = jest.spyOn(api, 'createAttachments');
    spyOnBulkCreateAttachments.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );

      await waitForNextUpdate();
      result.current.createAttachments({
        caseId: basicCaseId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        data: attachmentsWithoutOwner,
        updateCase: updateCaseCallback,
      });

      expect(result.current).toEqual({
        isLoading: false,
        isError: true,
        createAttachments: result.current.createAttachments,
      });

      expect(toastErrorMock).toHaveBeenCalledWith(expect.any(Error), {
        title: 'Error fetching data',
      });
    });
  });

  it('throws an error when invoked with throwOnError true', async () => {
    const spyOnBulkCreateAttachments = jest.spyOn(api, 'createAttachments');
    spyOnBulkCreateAttachments.mockImplementation(() => {
      throw new Error('This is not possible');
    });

    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<string, UseCreateAttachments>(() =>
        useCreateAttachments()
      );

      await waitForNextUpdate();

      async function test() {
        await result.current.createAttachments({
          caseId: basicCaseId,
          caseOwner: SECURITY_SOLUTION_OWNER,
          data: attachmentsWithoutOwner,
          updateCase: updateCaseCallback,
          throwOnError: true,
        });
      }
      expect(test()).rejects.toThrowError('This is not possible');
    });
  });
});
