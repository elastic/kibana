/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unmountComponentAtNode } from 'react-dom';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { PropsWithChildren } from 'react';
import React from 'react';
import {
  getMockApplications$,
  getMockCurrentAppId$,
  getMockLensApi,
  mockLensAttributes,
  getMockServices,
} from './mocks';
import { useKibana } from '../../../common/lib/kibana';
import { waitFor } from '@testing-library/react';
import { openModal } from './open_modal';
import type { CasesActionContextProps } from './types';

const element = document.createElement('div');
document.body.appendChild(element);

jest.mock('../../all_cases/selector_modal/use_cases_add_to_existing_case_modal', () => ({
  useCasesAddToExistingCaseModal: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  KibanaThemeProvider: jest
    .fn()
    .mockImplementation(({ children }: PropsWithChildren<unknown>) => <>{children}</>),
}));

jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
    KibanaContextProvider: jest
      .fn()
      .mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>),
  };
});

jest.mock('react-dom', () => {
  const original = jest.requireActual('react-dom');
  return { ...original, unmountComponentAtNode: jest.fn() };
});

jest.mock('./action_wrapper');

describe('openModal', () => {
  const mockUseCasesAddToExistingCaseModal = useCasesAddToExistingCaseModal as jest.Mock;
  const mockOpenModal = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers({ now: new Date('2024-01-01T00:00:00.000Z') });
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    mockUseCasesAddToExistingCaseModal.mockReturnValue({
      open: mockOpenModal,
    });

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: getMockCurrentAppId$(),
          applications$: getMockApplications$(),
        },
      },
    });

    jest.clearAllMocks();
  });

  it('should open modal with an attachment with the time range as relative values', async () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();

      const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
      const res = getAttachments();

      expect(res).toEqual([
        {
          persistableStateAttachmentState: {
            attributes: mockLensAttributes,
            timeRange: {
              from: '2023-12-31T00:00:00.000Z',
              to: '2024-01-01T00:00:00.000Z',
            },
          },
          persistableStateAttachmentTypeId: '.lens',
          type: 'persistableState',
        },
      ]);
    });
  });

  it('should have correct onClose handler - when close modal clicked', () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
    onClose();
    expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
  });

  it('should have correct onClose handler - when case selected', () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
    onClose({ id: 'case-id', title: 'case-title' });
    expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
  });

  it('should have correct onClose handler - when case created', () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
    onClose(null, true);
    expect(unmountComponentAtNode as jest.Mock).not.toHaveBeenCalled();
  });

  it('should have correct onSuccess handler', () => {
    openModal(
      getMockLensApi(),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    const onSuccess = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess;
    onSuccess();
    expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
  });

  it('should open modal with an attachment with the time range in absolute values', async () => {
    openModal(
      getMockLensApi({ from: '2024-01-09T00:00:00.000Z', to: '2024-01-10T00:00:00.000Z' }),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();

      const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
      const res = getAttachments();

      expect(res).toEqual([
        {
          persistableStateAttachmentState: {
            attributes: mockLensAttributes,
            timeRange: {
              from: '2024-01-09T00:00:00.000Z',
              to: '2024-01-10T00:00:00.000Z',
            },
          },
          persistableStateAttachmentTypeId: '.lens',
          type: 'persistableState',
        },
      ]);
    });
  });

  it('should open modal with an attachment with the time range in absolute and relative values', async () => {
    openModal(
      getMockLensApi({ from: '2023-12-01T00:00:00.000Z', to: 'now' }),
      'myAppId',
      {} as unknown as CasesActionContextProps,
      getMockServices()
    );

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();

      const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
      const res = getAttachments();

      expect(res).toEqual([
        {
          persistableStateAttachmentState: {
            attributes: mockLensAttributes,
            timeRange: {
              from: '2023-12-01T00:00:00.000Z',
              to: '2024-01-01T00:00:00.000Z',
            },
          },
          persistableStateAttachmentTypeId: '.lens',
          type: 'persistableState',
        },
      ]);
    });
  });
});
