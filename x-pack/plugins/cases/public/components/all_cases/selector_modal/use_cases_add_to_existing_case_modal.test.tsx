/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/dom';
import { act, renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import React from 'react';
import AllCasesSelectorModal from '.';
import { Case, CaseStatuses, StatusAll } from '../../../../common';
import { AppMockRenderer, createAppMockRenderer } from '../../../common/mock';
import { useCasesToast } from '../../../common/use_cases_toast';
import { alertComment } from '../../../containers/mock';
import { useBulkCreateAttachments } from '../../../containers/use_bulk_create_attachments';
import { SupportedCaseAttachment } from '../../../types';
import { CasesContext } from '../../cases_context';
import { CasesContextStoreActionsList } from '../../cases_context/cases_context_reducer';
import { useCasesAddToExistingCaseModal } from './use_cases_add_to_existing_case_modal';

jest.mock('../../../common/use_cases_toast');
jest.mock('../../../containers/use_bulk_create_attachments');
// dummy mock, will call onRowclick when rendering
jest.mock('./all_cases_selector_modal', () => {
  return {
    AllCasesSelectorModal: jest.fn(),
  };
});

const useCasesToastMock = useCasesToast as jest.Mock;

const AllCasesSelectorModalMock = AllCasesSelectorModal as unknown as jest.Mock;

// test component to test the hook integration
const TestComponent: React.FC = () => {
  const hook = useCasesAddToExistingCaseModal({
    attachments: [alertComment as SupportedCaseAttachment],
  });

  const onClick = () => {
    hook.open();
  };

  return <button type="button" data-test-subj="open-modal" onClick={onClick} />;
};

const useBulkCreateAttachmentsMock = useBulkCreateAttachments as jest.Mock;

describe('use cases add to existing case modal hook', () => {
  useBulkCreateAttachmentsMock.mockReturnValue({
    bulkCreateAttachments: jest.fn(),
  });

  const dispatch = jest.fn();
  let appMockRender: AppMockRenderer;
  const wrapper: React.FC = ({ children }) => {
    return (
      <CasesContext.Provider
        value={{
          owner: ['test'],
          userCanCrud: true,
          appId: 'test',
          appTitle: 'jest',
          basePath: '/jest',
          dispatch,
          features: { alerts: { sync: true, enabled: true }, metrics: [] },
          releasePhase: 'ga',
        }}
      >
        {children}
      </CasesContext.Provider>
    );
  };

  const defaultParams = () => {
    return { onRowClick: jest.fn() };
  };
  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    dispatch.mockReset();
    AllCasesSelectorModalMock.mockReset();
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

  it('should call bulkCreateAttachments when a case is selected and show a toast message', async () => {
    const mockedPostMessage = jest.fn();
    useBulkCreateAttachmentsMock.mockReturnValueOnce({
      bulkCreateAttachments: mockedPostMessage,
    });

    const mockedToastSuccess = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test' } as Case);
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockedPostMessage).toHaveBeenCalledWith({
        caseId: 'test',
        data: alertComment,
        throwOnError: true,
      });
    });
    expect(mockedToastSuccess).toHaveBeenCalled();
  });

  it('should not call bulkCreateAttachments nor show toast success when  a case is not selected', async () => {
    const mockedPostMessage = jest.fn();
    useBulkCreateAttachmentsMock.mockReturnValueOnce({
      bulkCreateAttachments: mockedPostMessage,
    });

    const mockedToastSuccess = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick();
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));
    // give a small delay for the reducer to run

    act(() => {
      expect(mockedPostMessage).not.toHaveBeenCalled();
      expect(mockedToastSuccess).not.toHaveBeenCalled();
    });
  });

  it('should not show toast success when a case is selected with attachments and fails to update attachments', async () => {
    const mockedPostMessage = jest.fn().mockRejectedValue(new Error('Impossible'));
    useBulkCreateAttachmentsMock.mockReturnValueOnce({
      bulkCreateAttachments: mockedPostMessage,
    });

    const mockedToast = jest.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToast,
    });

    // simulate a case selected
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test' } as Case);
      return null;
    });

    const result = appMockRender.render(<TestComponent />);
    userEvent.click(result.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockedPostMessage).toHaveBeenCalledWith({
        caseId: 'test',
        data: alertComment,
        throwOnError: true,
      });
    });

    act(() => {
      expect(mockedPostMessage).toHaveBeenCalled();
      expect(mockedToast).not.toHaveBeenCalled();
    });
  });
});
