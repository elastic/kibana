/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */
import React, { ReactNode } from 'react';
import { mount } from 'enzyme';
import { EuiGlobalToastList } from '@elastic/eui';

import { useKibana } from '../../../common/lib/kibana';
import { useStateToaster } from '../../../common/components/toasters';
import { TestProviders } from '../../../common/mock';
import { usePostComment } from '../../containers/use_post_comment';
import { Case } from '../../containers/types';
import { AddToCaseAction } from './add_to_case_action';

jest.mock('../../containers/use_post_comment');
jest.mock('../../../common/lib/kibana');

jest.mock('../../../common/components/toasters', () => {
  const actual = jest.requireActual('../../../common/components/toasters');
  return {
    ...actual,
    useStateToaster: jest.fn(),
  };
});

jest.mock('../all_cases', () => {
  return {
    AllCases: ({ onRowClick }: { onRowClick: ({ id }: { id: string }) => void }) => {
      return (
        <button
          type="button"
          data-test-subj="all-cases-modal-button"
          onClick={() => onRowClick({ id: 'selected-case' })}
        >
          {'case-row'}
        </button>
      );
    },
  };
});

jest.mock('../create/form_context', () => {
  return {
    FormContext: ({
      children,
      onSuccess,
    }: {
      children: ReactNode;
      onSuccess: (theCase: Partial<Case>) => void;
    }) => {
      return (
        <>
          <button
            type="button"
            data-test-subj="form-context-on-success"
            onClick={() =>
              onSuccess({ id: 'new-case', title: 'the new case', settings: { syncAlerts: true } })
            }
          >
            {'submit'}
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

const usePostCommentMock = usePostComment as jest.Mock;
const postComment = jest.fn();
const defaultPostComment = {
  isLoading: false,
  isError: false,
  postComment,
};

describe('AddToCaseAction', () => {
  const props = {
    ecsRowData: {
      _id: 'test-id',
      _index: 'test-index',
    },
    disabled: false,
  };

  const mockDispatchToaster = jest.fn();
  const mockNavigateToApp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    usePostCommentMock.mockImplementation(() => defaultPostComment);
    (useStateToaster as jest.Mock).mockReturnValue([jest.fn(), mockDispatchToaster]);
    (useKibana as jest.Mock).mockReturnValue({
      services: { application: { navigateToApp: mockNavigateToApp } },
    });
  });

  it('it renders', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).exists()).toBeTruthy();
  });

  it('it opens the context menu', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    expect(wrapper.find(`[data-test-subj="add-new-case-item"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).exists()).toBeTruthy();
  });

  it('it opens the create case modal', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="form-context-on-success"]`).exists()).toBeTruthy();
  });

  it('it attach the alert to case on case creation', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');

    wrapper.find(`[data-test-subj="form-context-on-success"]`).first().simulate('click');

    expect(postComment.mock.calls[0][0].caseId).toBe('new-case');
    expect(postComment.mock.calls[0][0].data).toEqual({
      alertId: 'test-id',
      index: 'test-index',
      rule: {
        id: null,
        name: null,
      },
      type: 'alert',
    });
  });

  it('it opens the all cases modal', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');

    expect(wrapper.find(`[data-test-subj="all-cases-modal-button"]`).exists()).toBeTruthy();
  });

  it('it attach the alert to case after selecting a case', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-existing-case-menu-item"]`).first().simulate('click');

    wrapper.find(`[data-test-subj="all-cases-modal-button"]`).first().simulate('click');

    expect(postComment.mock.calls[0][0].caseId).toBe('selected-case');
    expect(postComment.mock.calls[0][0].data).toEqual({
      alertId: 'test-id',
      index: 'test-index',
      rule: {
        id: null,
        name: null,
      },
      type: 'alert',
    });
  });

  it('navigates to case view', async () => {
    usePostCommentMock.mockImplementation(() => {
      return {
        ...defaultPostComment,
        postComment: jest.fn().mockImplementation(({ caseId, data, updateCase }) => updateCase()),
      };
    });

    const wrapper = mount(
      <TestProviders>
        <AddToCaseAction {...props} />
      </TestProviders>
    );

    wrapper.find(`[data-test-subj="attach-alert-to-case-button"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="add-new-case-item"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="form-context-on-success"]`).first().simulate('click');

    expect(mockDispatchToaster).toHaveBeenCalled();
    const toast = mockDispatchToaster.mock.calls[0][0].toast;

    const toastWrapper = mount(
      <EuiGlobalToastList toasts={[toast]} toastLifeTimeMs={6000} dismissToast={() => {}} />
    );

    toastWrapper
      .find('[data-test-subj="toaster-content-case-view-link"]')
      .first()
      .simulate('click');

    expect(mockNavigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/new-case' });
  });
});
