/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, act as reactAct } from '@testing-library/react';

import { useKibana } from '../../common/lib/kibana';
import { useCreateCaseModal, UseCreateCaseModalProps, UseCreateCaseModalReturnedValues } from '.';
import { TestProviders } from '../../common/mock';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const onCaseCreated = jest.fn();

describe('useCreateCaseModal', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('init', async () => {
    const { result } = renderHook<UseCreateCaseModalProps, UseCreateCaseModalReturnedValues>(
      () => useCreateCaseModal({ onCaseCreated }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    expect(result.current.isModalOpen).toBe(false);
  });

  it('opens the modal', async () => {
    const { result } = renderHook<UseCreateCaseModalProps, UseCreateCaseModalReturnedValues>(
      () => useCreateCaseModal({ onCaseCreated }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    act(() => {
      result.current.openModal();
    });

    expect(result.current.isModalOpen).toBe(true);
  });

  it('closes the modal', async () => {
    const { result } = renderHook<UseCreateCaseModalProps, UseCreateCaseModalReturnedValues>(
      () => useCreateCaseModal({ onCaseCreated }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    act(() => {
      result.current.openModal();
      result.current.closeModal();
    });

    expect(result.current.isModalOpen).toBe(false);
  });

  it('returns a memoized value', async () => {
    const { result, rerender } = renderHook<
      UseCreateCaseModalProps,
      UseCreateCaseModalReturnedValues
    >(() => useCreateCaseModal({ onCaseCreated }), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    const result1 = result.current;
    act(() => rerender());
    const result2 = result.current;

    expect(Object.is(result1, result2)).toBe(true);
  });

  it('closes the modal when creating a case', async () => {
    const { result } = renderHook<UseCreateCaseModalProps, UseCreateCaseModalReturnedValues>(
      () => useCreateCaseModal({ onCaseCreated }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    act(() => {
      result.current.openModal();
    });

    await reactAct(async () => {
      const modal = result.current.modal;
      render(<TestProviders>{modal}</TestProviders>);
    });

    act(() => {
      result.current.modal.props.onSuccess({ id: 'case-id' });
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(onCaseCreated).toHaveBeenCalledWith({ id: 'case-id' });
  });
});
