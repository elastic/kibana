/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { useAddToExistingCase } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      cases: {
        hooks: {
          useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
            open: jest.fn(),
          }),
        },
      },
    },
  }),
}));

describe('useAddToExistingCase', () => {
  const mockCanUserCreateAndReadCases = jest.fn();
  const mockOnClick = jest.fn();
  const mockAlertIds = ['alert1', 'alert2'];
  const mockMarkdownComments = ['Comment 1', 'Comment 2'];
  const mockReplacements = { alert1: 'replacement1', alert2: 'replacement2' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables the action when a user can NOT create and read cases', () => {
    mockCanUserCreateAndReadCases.mockReturnValue(false);

    const { result } = renderHook(
      () =>
        useAddToExistingCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          onClick: mockOnClick,
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.disabled).toBe(true);
  });

  it('enables the action when a user can create and read cases', () => {
    mockCanUserCreateAndReadCases.mockReturnValue(true);

    const { result } = renderHook(
      () =>
        useAddToExistingCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          onClick: mockOnClick,
        }),
      {
        wrapper: TestProviders,
      }
    );

    expect(result.current.disabled).toBe(false);
  });

  it('calls the openSelectCaseModal function with the expected attachments', () => {
    mockCanUserCreateAndReadCases.mockReturnValue(true);
    const mockOpenSelectCaseModal = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
              open: mockOpenSelectCaseModal,
            }),
          },
        },
      },
    });

    const { result } = renderHook(
      () =>
        useAddToExistingCase({
          canUserCreateAndReadCases: mockCanUserCreateAndReadCases,
          onClick: mockOnClick,
        }),
      {
        wrapper: TestProviders,
      }
    );

    act(() => {
      result.current.onAddToExistingCase({
        alertIds: mockAlertIds,
        markdownComments: mockMarkdownComments,
        replacements: mockReplacements,
      });
    });

    expect(mockOpenSelectCaseModal).toHaveBeenCalledWith({
      getAttachments: expect.any(Function),
    });

    const getAttachments = mockOpenSelectCaseModal.mock.calls[0][0].getAttachments;
    const attachments = getAttachments();

    expect(attachments).toHaveLength(4);
    expect(attachments[0]).toEqual({
      comment: 'Comment 1',
      type: 'user',
    });
    expect(attachments[1]).toEqual({
      comment: 'Comment 2',
      type: 'user',
    });
    expect(attachments[2]).toEqual({
      alertId: 'replacement1', // <-- case attachment uses the replacement values
      index: '',
      rule: {
        id: null,
        name: null,
      },
      type: 'alert',
    });
    expect(attachments[3]).toEqual({
      alertId: 'replacement2',
      index: '',
      rule: {
        id: null,
        name: null,
      },
      type: 'alert',
    });
  });
});
