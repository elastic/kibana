/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { waitFor, act } from '@testing-library/react';
import { noop } from 'lodash/fp';

import { noCreateCasesPermissions, TestProviders } from '../../common/mock';

import { CommentType } from '../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import type { AddCommentProps, AddCommentRefObject } from '.';
import { AddComment } from '.';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { timelineIntegrationMock } from '../__mock__/timeline';
import type { CaseAttachmentWithoutOwner } from '../../types';

jest.mock('../../containers/use_create_attachments');

const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const onCommentSaving = jest.fn();
const onCommentPosted = jest.fn();
const createAttachments = jest.fn();

const addCommentProps: AddCommentProps = {
  id: 'newComment',
  caseId: '1234',
  onCommentSaving,
  onCommentPosted,
  showLoading: false,
  statusActionButton: null,
};

const defaultResponse = {
  isLoading: false,
  isError: false,
  createAttachments,
};

const sampleData: CaseAttachmentWithoutOwner = {
  comment: 'what a cool comment',
  type: CommentType.user as const,
};

describe('AddComment ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCreateAttachmentsMock.mockImplementation(() => defaultResponse);
  });

  it('should post comment on submit click', async () => {
    const wrapper = mount(
      <TestProviders>
        <AddComment {...addCommentProps} />
      </TestProviders>
    );

    wrapper
      .find(`[data-test-subj="add-comment"] textarea`)
      .first()
      .simulate('change', { target: { value: sampleData.comment } });

    expect(wrapper.find(`[data-test-subj="add-comment"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="loading-spinner"]`).exists()).toBeFalsy();

    wrapper.find(`[data-test-subj="submit-comment"]`).first().simulate('click');
    await waitFor(() => {
      expect(onCommentSaving).toBeCalled();
      expect(createAttachments).toBeCalledWith({
        caseId: addCommentProps.caseId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        data: [sampleData],
        updateCase: onCommentPosted,
      });
      expect(wrapper.find(`[data-test-subj="add-comment"] textarea`).text()).toBe('');
    });
  });

  it('should render spinner and disable submit when loading', () => {
    useCreateAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));
    const wrapper = mount(
      <TestProviders>
        <AddComment {...{ ...addCommentProps, showLoading: true }} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="loading-spinner"]`).exists()).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="submit-comment"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });

  it('should disable submit button when isLoading is true', () => {
    useCreateAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));
    const wrapper = mount(
      <TestProviders>
        <AddComment {...addCommentProps} />
      </TestProviders>
    );

    expect(
      wrapper.find(`[data-test-subj="submit-comment"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });

  it('should hide the component when the user does not have create permissions', () => {
    useCreateAttachmentsMock.mockImplementation(() => ({
      ...defaultResponse,
      isLoading: true,
    }));
    const wrapper = mount(
      <TestProviders permissions={noCreateCasesPermissions()}>
        <AddComment {...{ ...addCommentProps }} />
      </TestProviders>
    );

    expect(wrapper.find(`[data-test-subj="add-comment"]`).exists()).toBeFalsy();
  });

  it('should insert a quote', async () => {
    const sampleQuote = 'what a cool quote \n with new lines';
    const ref = React.createRef<AddCommentRefObject>();
    const wrapper = mount(
      <TestProviders>
        <AddComment {...addCommentProps} ref={ref} />
      </TestProviders>
    );

    wrapper
      .find(`[data-test-subj="add-comment"] textarea`)
      .first()
      .simulate('change', { target: { value: sampleData.comment } });

    await act(async () => {
      ref.current!.addQuote(sampleQuote);
    });

    expect(wrapper.find(`[data-test-subj="add-comment"] textarea`).text()).toBe(
      `${sampleData.comment}\n\n> what a cool quote \n>  with new lines \n\n`
    );
  });

  it('should call onFocus when adding a quote', async () => {
    const ref = React.createRef<AddCommentRefObject>();

    mount(
      <TestProviders>
        <AddComment {...addCommentProps} ref={ref} />
      </TestProviders>
    );

    ref.current!.editor!.textarea!.focus = jest.fn();
    await act(async () => {
      ref.current!.addQuote('a comment');
    });

    expect(ref.current!.editor!.textarea!.focus).toHaveBeenCalled();
  });

  it('should NOT call onFocus on mount', async () => {
    const ref = React.createRef<AddCommentRefObject>();

    mount(
      <TestProviders>
        <AddComment {...addCommentProps} ref={ref} />
      </TestProviders>
    );

    ref.current!.editor!.textarea!.focus = jest.fn();
    expect(ref.current!.editor!.textarea!.focus).not.toHaveBeenCalled();
  });

  it('it should insert a timeline', async () => {
    const useInsertTimelineMock = jest.fn();
    let attachTimeline = noop;
    useInsertTimelineMock.mockImplementation((comment, onTimelineAttached) => {
      attachTimeline = onTimelineAttached;
    });

    const mockTimelineIntegration = { ...timelineIntegrationMock };
    mockTimelineIntegration.hooks.useInsertTimeline = useInsertTimelineMock;

    const wrapper = mount(
      <TestProviders>
        <CasesTimelineIntegrationProvider timelineIntegration={mockTimelineIntegration}>
          <AddComment {...addCommentProps} />
        </CasesTimelineIntegrationProvider>
      </TestProviders>
    );

    act(() => {
      attachTimeline('[title](url)');
    });

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="add-comment"] textarea`).text()).toBe('[title](url)');
    });
  });
});
