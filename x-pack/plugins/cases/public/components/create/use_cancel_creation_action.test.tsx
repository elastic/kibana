/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { useCancelCreationAction } from './use_cancel_creation_action';

describe('UseConfirmationModal', () => {
  let appMockRender: AppMockRenderer;
  const onConfirmationCallback = jest.fn();

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('init', async () => {
    const { result } = renderHook(() => useCancelCreationAction({ onConfirmationCallback }), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current.showConfirmationModal).toBe(false);
  });

  it('opens the modal', async () => {
    const { result } = renderHook(() => useCancelCreationAction({ onConfirmationCallback }), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onOpenModal();
    });

    expect(result.current.showConfirmationModal).toBe(true);
  });

  it('closes the modal', async () => {
    const { result } = renderHook(() => useCancelCreationAction({ onConfirmationCallback }), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onOpenModal();
    });

    expect(result.current.showConfirmationModal).toBe(true);

    act(() => {
      result.current.onCancelModal();
    });

    expect(result.current.showConfirmationModal).toBe(false);
  });

  it('calls onConfirmationCallback on confirm', async () => {
    const { result } = renderHook(() => useCancelCreationAction({ onConfirmationCallback }), {
      wrapper: appMockRender.AppWrapper,
    });

    act(() => {
      result.current.onOpenModal();
    });

    expect(result.current.showConfirmationModal).toBe(true);

    act(() => {
      result.current.onConfirmModal();
    });

    expect(result.current.showConfirmationModal).toBe(false);
    expect(onConfirmationCallback).toHaveBeenCalled();
  });
});
