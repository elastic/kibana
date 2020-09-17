/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';

import { useKibana } from '../../../common/lib/kibana';
import '../../../common/mock/match_media';
import { TimelineId } from '../../../../common/types/timeline';
import { useAllCasesModal, UseAllCasesModalProps, UseAllCasesModalReturnedValues } from '.';
import { TestProviders } from '../../../common/mock';

jest.mock('../../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useAllCasesModal', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('init', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    expect(result.current.showModal).toBe(false);
  });

  it('opens the modal', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    act(() => {
      result.current.onOpenModal();
    });

    expect(result.current.showModal).toBe(true);
  });

  it('closes the modal', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    act(() => {
      result.current.onOpenModal();
      result.current.onCloseModal();
    });

    expect(result.current.showModal).toBe(false);
  });

  it('returns a memoized value', async () => {
    const { result, rerender } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    const result1 = result.current;
    act(() => rerender());
    const result2 = result.current;

    expect(result1).toBe(result2);
  });

  it('closes the modal when clicking a row', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    act(() => {
      result.current.onOpenModal();
      result.current.onRowClick();
    });

    expect(result.current.showModal).toBe(false);
  });

  it('navigates to the correct path without id', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    act(() => {
      result.current.onOpenModal();
      result.current.onRowClick();
    });

    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/create' });
  });

  it('navigates to the correct path with id', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ timelineId: TimelineId.test }),
      {
        wrapper: ({ children }) => <TestProviders> {children}</TestProviders>,
      }
    );

    act(() => {
      result.current.onOpenModal();
      result.current.onRowClick('case-id');
    });

    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/case-id' });
  });
});
