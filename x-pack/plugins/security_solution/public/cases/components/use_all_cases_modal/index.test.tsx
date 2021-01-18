/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../common/lib/kibana';
import '../../../common/mock/match_media';
import { useAllCasesModal, UseAllCasesModalProps, UseAllCasesModalReturnedValues } from '.';
import { mockTimelineModel, TestProviders } from '../../../common/mock';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../common/lib/kibana');
jest.mock('../all_cases', () => {
  return {
    AllCases: ({ onRowClick }: { onRowClick: ({ id }: { id: string }) => void }) => {
      return (
        <button type="button" onClick={() => onRowClick({ id: 'case-id' })}>
          {'case-row'}
        </button>
      );
    },
  };
});

jest.mock('../../../common/hooks/use_selector');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const onRowClick = jest.fn();

describe('useAllCasesModal', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

  it('init', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ onRowClick }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    expect(result.current.isModalOpen).toBe(false);
  });

  it('opens the modal', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ onRowClick }),
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
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ onRowClick }),
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
    const { result, rerender } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ onRowClick }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    const result1 = result.current;
    act(() => rerender());
    const result2 = result.current;

    expect(Object.is(result1, result2)).toBe(true);
  });

  it('closes the modal when clicking a row', async () => {
    const { result } = renderHook<UseAllCasesModalProps, UseAllCasesModalReturnedValues>(
      () => useAllCasesModal({ onRowClick }),
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    act(() => {
      result.current.openModal();
    });

    const modal = result.current.modal;
    render(<>{modal}</>);

    act(() => {
      userEvent.click(screen.getByText('case-row'));
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(onRowClick).toHaveBeenCalledWith({ id: 'case-id' });
  });
});
