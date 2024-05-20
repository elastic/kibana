/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import { useDeletePropertyAction } from './use_delete_property_action';

describe('UserActionPropertyActions', () => {
  let appMockRender: AppMockRenderer;
  const onDelete = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(() => useDeletePropertyAction({ onDelete }), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.showDeletionModal).toBe(false);
  });

  it('opens the modal', async () => {
    const { result } = renderHook(() => useDeletePropertyAction({ onDelete }), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onModalOpen();
    });

    expect(result.current.showDeletionModal).toBe(true);
  });

  it('closes the modal', async () => {
    const { result } = renderHook(() => useDeletePropertyAction({ onDelete }), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onModalOpen();
    });

    expect(result.current.showDeletionModal).toBe(true);

    act(() => {
      result.current.onCancel();
    });

    expect(result.current.showDeletionModal).toBe(false);
  });

  it('calls onDelete on confirm', async () => {
    const { result } = renderHook(() => useDeletePropertyAction({ onDelete }), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onModalOpen();
    });

    expect(result.current.showDeletionModal).toBe(true);

    act(() => {
      result.current.onConfirm();
    });

    expect(result.current.showDeletionModal).toBe(false);
    expect(onDelete).toHaveBeenCalled();
  });
});
