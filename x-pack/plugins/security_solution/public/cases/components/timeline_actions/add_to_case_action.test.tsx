/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */
import React, { ReactNode } from 'react';

import { mount } from 'enzyme';
import { TestProviders } from '../../../common/mock';
import { usePostComment } from '../../containers/use_post_comment';
import { AddToCaseAction } from './add_to_case_action';

jest.mock('../../containers/use_post_comment');
jest.mock('../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../common/lib/kibana');
  return {
    ...originalModule,
    useGetUserSavedObjectPermissions: jest.fn(),
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
      onSuccess: ({ id }: { id: string }) => void;
    }) => {
      return (
        <>
          <button
            type="button"
            data-test-subj="form-context-on-success"
            onClick={() => onSuccess({ id: 'new-case' })}
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

  beforeEach(() => {
    jest.resetAllMocks();
    usePostCommentMock.mockImplementation(() => defaultPostComment);
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

    expect(postComment.mock.calls[0][0]).toBe('new-case');
    expect(postComment.mock.calls[0][1]).toEqual({
      alertId: 'test-id',
      index: 'test-index',
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

    expect(postComment.mock.calls[0][0]).toBe('selected-case');
    expect(postComment.mock.calls[0][1]).toEqual({
      alertId: 'test-id',
      index: 'test-index',
      type: 'alert',
    });
  });
});
