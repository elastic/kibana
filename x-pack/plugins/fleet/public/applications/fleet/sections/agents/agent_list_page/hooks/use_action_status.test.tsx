/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { sendGetActionStatus, sendPostCancelAction, useStartServices } from '../../../../hooks';

import { useActionStatus } from './use_action_status';

jest.mock('../../../../hooks', () => ({
  sendGetActionStatus: jest.fn(),
  sendPostCancelAction: jest.fn(),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    overlays: {
      openConfirm: jest.fn(),
    },
  }),
}));

describe('useActionStatus', () => {
  const mockSendGetActionStatus = sendGetActionStatus as jest.Mock;
  const mockSendPostCancelAction = sendPostCancelAction as jest.Mock;
  const startServices = useStartServices();
  const mockOpenConfirm = startServices.overlays.openConfirm as jest.Mock;
  const mockErrorToast = startServices.notifications.toasts.addError as jest.Mock;
  const mockOnAbortSuccess = jest.fn();
  const mockActionStatuses = [
    {
      actionId: 'action1',
      nbAgentsActionCreated: 2,
      nbAgentsAck: 1,
      nbAgentsFailed: 0,
      nbAgentsActioned: 2,
      creationTime: '2022-09-19T12:07:27.102Z',
    },
  ];
  beforeEach(() => {
    mockSendGetActionStatus.mockReset();
    mockSendGetActionStatus.mockResolvedValue({ data: { items: mockActionStatuses } });
    mockSendPostCancelAction.mockReset();
    mockOnAbortSuccess.mockReset();
    mockOpenConfirm.mockReset();
    mockOpenConfirm.mockResolvedValue({});
    mockErrorToast.mockReset();
    mockErrorToast.mockResolvedValue({});
  });
  it('should set action statuses on init', async () => {
    let result: any | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useActionStatus(mockOnAbortSuccess, false, 20, null)));
    });
    expect(result?.current.currentActions).toEqual(mockActionStatuses);
  });

  it('should refresh statuses on refresh flag', async () => {
    let refresh = false;
    await act(async () => {
      const result = renderHook(() => useActionStatus(mockOnAbortSuccess, refresh, 20, null));
      refresh = true;
      result.rerender();
    });
    expect(mockSendGetActionStatus).toHaveBeenCalledTimes(5);
  });

  it('should post cancel and invoke callback on cancel upgrade', async () => {
    mockSendPostCancelAction.mockResolvedValue({});
    let result: any | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useActionStatus(mockOnAbortSuccess, false, 20, null)));
    });
    await act(async () => {
      await result.current.abortUpgrade(mockActionStatuses[0]);
    });
    expect(mockSendPostCancelAction).toHaveBeenCalledWith('action1');
    expect(mockOnAbortSuccess).toHaveBeenCalled();
    expect(mockOpenConfirm).toHaveBeenCalledWith('This action will cancel upgrade of 1 agent', {
      title: 'Cancel upgrade?',
    });
  });

  it('should post cancel and invoke callback on cancel upgrade - plural', async () => {
    mockSendPostCancelAction.mockResolvedValue({});
    let result: any | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useActionStatus(mockOnAbortSuccess, false, 20, null)));
    });
    await act(async () => {
      await result.current.abortUpgrade({ ...mockActionStatuses[0], nbAgentsAck: 0 });
    });
    expect(mockSendPostCancelAction).toHaveBeenCalledWith('action1');
    expect(mockOnAbortSuccess).toHaveBeenCalled();
    expect(mockOpenConfirm).toHaveBeenCalledWith('This action will cancel upgrade of 2 agents', {
      title: 'Cancel upgrade?',
    });
  });

  it('should report error on cancel upgrade failure', async () => {
    const error = new Error('error');
    mockSendPostCancelAction.mockRejectedValue(error);
    let result: any | undefined;
    await act(async () => {
      ({ result } = renderHook(() => useActionStatus(mockOnAbortSuccess, false, 20, null)));
    });
    await act(async () => {
      await result.current.abortUpgrade(mockActionStatuses[0]);
    });
    expect(mockOnAbortSuccess).not.toHaveBeenCalled();
    expect(mockErrorToast).toHaveBeenCalledWith(error, {
      title: 'An error happened while cancelling upgrade',
    });
  });
});
