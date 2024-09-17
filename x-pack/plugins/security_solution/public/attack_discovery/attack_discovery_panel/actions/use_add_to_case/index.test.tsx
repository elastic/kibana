/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';

import { useAddToNewCase } from '.';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      cases: {
        hooks: {
          useCasesAddToNewCaseFlyout: jest.fn().mockReturnValue({
            open: jest.fn(),
          }),
        },
      },
    },
  }),
}));

describe('useAddToNewCase', () => {
  it('disables the action when a user can NOT create and read cases', () => {
    const canUserCreateAndReadCases = jest.fn().mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useAddToNewCase({
          canUserCreateAndReadCases,
          title: 'Persistent Execution of Malicious Application',
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.disabled).toBe(true);
  });

  it('enables the action when a user can create and read cases', () => {
    const canUserCreateAndReadCases = jest.fn().mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useAddToNewCase({
          canUserCreateAndReadCases,
          title: 'Persistent Execution of Malicious Application',
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.disabled).toBe(false);
  });

  it('calls the onClick callback when provided', () => {
    const onClick = jest.fn();
    const canUserCreateAndReadCases = jest.fn().mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useAddToNewCase({
          canUserCreateAndReadCases,
          title: 'Persistent Execution of Malicious Application',
          onClick,
        }),
      {
        wrapper: TestProviders,
      }
    );

    act(() => {
      result.current.onAddToNewCase({
        alertIds: ['alert1', 'alert2'],
        markdownComments: ['Comment 1', 'Comment 2'],
      });
    });

    expect(onClick).toHaveBeenCalled();
  });
});
