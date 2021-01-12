/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */
import React, { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../common/lib/kibana';
import '../../../common/mock/match_media';
import { useCreateCaseModal, UseCreateCaseModalProps, UseCreateCaseModalReturnedValues } from '.';
import { mockTimelineModel, TestProviders } from '../../../common/mock';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';

jest.mock('../../../common/lib/kibana');
jest.mock('../create/form_context', () => {
  return {
    FormContext: ({
      children,
      onSuccess,
    }: {
      children: ReactNode;
      onSuccess: ({ id }: { id: string }) => void;
    }) => {
      return (
        <>
          <button
            type="button"
            data-test-subj="form-context-on-success"
            onClick={() => onSuccess({ id: 'case-id' })}
          >
            {'Form submit'}
          </button>
          {children}
        </>
      );
    },
  };
});

jest.mock('../create/form', () => {
  return {
    CreateCaseForm: () => {
      return <>{'form'}</>;
    },
  };
});

jest.mock('../create/submit_button', () => {
  return {
    SubmitCaseButton: () => {
      return <>{'Submit'}</>;
    },
  };
});

jest.mock('../../../common/hooks/use_selector');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const onCaseCreated = jest.fn();

describe('useCreateCaseModal', () => {
  let navigateToApp: jest.Mock;

  beforeEach(() => {
    navigateToApp = jest.fn();
    useKibanaMock().services.application.navigateToApp = navigateToApp;
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
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

    const modal = result.current.modal;
    render(<TestProviders>{modal}</TestProviders>);

    act(() => {
      userEvent.click(screen.getByText('Form submit'));
    });

    expect(result.current.isModalOpen).toBe(false);
    expect(onCaseCreated).toHaveBeenCalledWith({ id: 'case-id' });
  });
});
