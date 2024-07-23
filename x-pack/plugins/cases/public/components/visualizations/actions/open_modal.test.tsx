/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  getMockApplications$,
  getMockCurrentAppId$,
  mockLensApi,
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

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: jest.fn(),
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
  const mockMount = jest.fn();
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
    (toMountPoint as jest.Mock).mockImplementation((node) => {
      ReactDOM.render(node, element);
      return mockMount;
    });
    jest.clearAllMocks();
    openModal(mockLensApi, 'myAppId', {} as unknown as CasesActionContextProps, getMockServices());
  });

  test('should open modal with an attachment', async () => {
    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalled();

      const getAttachments = mockOpenModal.mock.calls[0][0].getAttachments;
      expect(getAttachments()).toEqual([
        {
          persistableStateAttachmentState: {
            attributes: mockLensAttributes,
            timeRange: {
              from: 'now-24h',
              to: 'now',
            },
          },
          persistableStateAttachmentTypeId: '.lens',
          type: 'persistableState',
        },
      ]);
    });
  });

  test('should have correct onClose handler - when close modal clicked', () => {
    const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
    onClose();
    expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
  });

  test('should have correct onClose handler - when case selected', () => {
    const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
    onClose({ id: 'case-id', title: 'case-title' });
    expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
  });

  test('should have correct onClose handler - when case created', () => {
    const onClose = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onClose;
    onClose(null, true);
    expect(unmountComponentAtNode as jest.Mock).not.toHaveBeenCalled();
  });

  test('should have correct onSuccess handler', () => {
    const onSuccess = mockUseCasesAddToExistingCaseModal.mock.calls[0][0].onSuccess;
    onSuccess();
    expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
  });
});
