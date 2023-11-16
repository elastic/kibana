/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { act, renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AllCasesSelectorModal from '.';
import type { CaseUI } from '../../../../common';
import { StatusAll } from '../../../../common';
import { CaseStatuses } from '../../../../common/types/domain';
import type { AppMockRenderer } from '../../../common/mock';
import { allCasesPermissions, createAppMockRenderer } from '../../../common/mock';
import { useCasesToast } from '../../../common/use_cases_toast';
import { alertComment } from '../../../containers/mock';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { CasesContext } from '../../cases_context';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { ExternalReferenceAttachmentTypeRegistry } from '../../../client/attachment_framework/external_reference_registry';
import type { AddToExistingCaseModalProps } from './use_cases_add_to_existing_case_modal';
import { useCasesAddToExistingCaseModal } from './use_cases_add_to_existing_case_modal';
import { PersistableStateAttachmentTypeRegistry } from '../../../client/attachment_framework/persistable_state_registry';

jest.mock('../../../common/use_cases_toast');
jest.mock('../../../containers/use_create_attachments');
// dummy mock, will call onRowclick when rendering
jest.mock('./all_cases_selector_modal', () => {
  return {
    AllCasesSelectorModal: jest.fn(),
  };
});

const onSuccess = jest.fn();
const getAttachments = jest.fn().mockReturnValue([alertComment]);
const useCasesToastMock = useCasesToast as jest.Mock;
const AllCasesSelectorModalMock = AllCasesSelectorModal as unknown as jest.Mock;

// test component to test the hook integration
const TestComponent: React.FC<AddToExistingCaseModalProps> = (
  props: AddToExistingCaseModalProps = {}
) => {
  const hook = useCasesAddToExistingCaseModal({ onSuccess, ...props });

  const onClick = () => {
    hook.open({ getAttachments });
  };

  return <button type="button" data-test-subj="open-modal" onClick={onClick} />;
};

const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;

const externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

describe('use cases add to existing case modal hook', () => {
  useCreateAttachmentsMock.mockReturnValue({
    mutateAsync: jest.fn(),
  });

  const dispatch = jest.fn();
  let appMockRender: AppMockRenderer;
  const wrapper: React.FC = ({ children }) => {
    return (
      <CasesContext.Provider
        value={{
          externalReferenceAttachmentTypeRegistry,
          persistableStateAttachmentTypeRegistry,
          owner: ['test'],
          permissions: allCasesPermissions(),
          appId: 'test',
          appTitle: 'jest',
          basePath: '/jest',
          dispatch,
          features: { alerts: { sync: true, enabled: true, isExperimental: false }, metrics: [] },
          releasePhase: 'ga',
        }}
      >
        {children}
      </CasesContext.Provider>
    );
  };

  const defaultParams = () => {
    return { onSuccess };
  };

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    dispatch.mockReset();
    AllCasesSelectorModalMock.mockReset();
    onSuccess.mockReset();
  });

  it('should throw if called outside of a cases context', () => {
    const { result } = renderHook(() => {
      useCasesAddToExistingCaseModal(defaultParams());
    });
    expect(result.error?.message).toContain(
      'useCasesContext must be used within a CasesProvider and have a defined value'
    );
  });

  it('should dispatch the open action when invoked', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToExistingCaseModal(defaultParams());
      },
      { wrapper }
    );
    result.current.open();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL,
        payload: expect.objectContaining({
          hiddenStatuses: [CaseStatuses.closed, StatusAll],
        }),
      })
    );
  });

  it('should dispatch the close action for modal and flyout when invoked', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToExistingCaseModal(defaultParams());
      },
      { wrapper }
    );
    result.current.close();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL,
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT,
      })
    );
  });

  it('should call getAttachments with the case info', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(getAttachments).toHaveBeenCalledTimes(1);
      expect(getAttachments).toHaveBeenCalledWith({ theCase: { id: 'test', owner: 'cases' } });
    });
  });

  it('should show a toaster info when no attachments are defined and noAttachmentsToaster is defined', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    getAttachments.mockReturnValueOnce([]);

    const mockedToastInfo = jest.fn();
    useCasesToastMock.mockReturnValue({
      showInfoToast: mockedToastInfo,
    });

    const result = appMockRender.render(
      <TestComponent noAttachmentsToaster={{ title: 'My title', content: 'My content' }} />
    );
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockedToastInfo).toHaveBeenCalledWith('My title', 'My content');
    });
  });

  it('should show a toaster info when no attachments are defined and noAttachmentsToaster is not defined', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    getAttachments.mockReturnValueOnce([]);

    const mockedToastInfo = jest.fn();
    useCasesToastMock.mockReturnValue({
      showInfoToast: mockedToastInfo,
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockedToastInfo).toHaveBeenCalledWith('No attachments added to the case', undefined);
    });
  });

  it('should call createAttachments when a case is selected and show a toast message', async () => {
    const mockBulkCreateAttachments = jest.fn();
    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToastSuccess = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockBulkCreateAttachments).toHaveBeenCalledTimes(1);
      expect(mockBulkCreateAttachments).toHaveBeenCalledWith({
        caseId: 'test',
        caseOwner: 'cases',
        attachments: [alertComment],
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalled();
  });

  it('should call onSuccess when defined', async () => {
    const mockBulkCreateAttachments = jest.fn();

    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToastSuccess = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should not call createAttachments nor show toast success when a case is not selected', async () => {
    const mockBulkCreateAttachments = jest.fn();
    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToastSuccess = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      return null;
    });

    const result = appMockRender.render(<TestComponent />);

    userEvent.click(result.getByTestId('open-modal'));
    // give a small delay for the reducer to run

    act(() => {
      expect(mockBulkCreateAttachments).not.toHaveBeenCalled();
      expect(mockedToastSuccess).not.toHaveBeenCalled();
    });
  });

  it('should not show toast success when a case is selected with attachments and fails to update attachments', async () => {
    const mockBulkCreateAttachments = jest.fn().mockRejectedValue(new Error('Impossible'));
    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToast = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToast,
    });

    // simulate a case selected
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockBulkCreateAttachments).toHaveBeenCalledWith({
        caseId: 'test',
        caseOwner: 'cases',
        attachments: [alertComment],
      });
    });

    act(() => {
      expect(mockBulkCreateAttachments).toHaveBeenCalled();
      expect(mockedToast).not.toHaveBeenCalled();
    });
  });
});
