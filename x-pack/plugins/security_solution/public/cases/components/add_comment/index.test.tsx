/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { AddComment } from '.';
import { TestProviders } from '../../../common/mock';
import { getFormMock } from '../__mock__/form';
import { Router, routeData, mockHistory, mockLocation } from '../__mock__/router';

import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { usePostComment } from '../../containers/use_post_comment';
import { useForm } from '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import { wait } from '../../../common/lib/helpers';

jest.mock(
  '../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form'
);

jest.mock('../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline');
jest.mock('../../containers/use_post_comment');

export const useFormMock = useForm as jest.Mock;

const useInsertTimelineMock = useInsertTimeline as jest.Mock;
const usePostCommentMock = usePostComment as jest.Mock;

const onCommentSaving = jest.fn();
const onCommentPosted = jest.fn();
const postComment = jest.fn();
const handleCursorChange = jest.fn();
const handleOnTimelineChange = jest.fn();

const addCommentProps = {
  caseId: '1234',
  disabled: false,
  insertQuote: null,
  onCommentSaving,
  onCommentPosted,
  showLoading: false,
};

const defaultInsertTimeline = {
  cursorPosition: {
    start: 0,
    end: 0,
  },
  handleCursorChange,
  handleOnTimelineChange,
};

const defaultPostCommment = {
  isLoading: false,
  isError: false,
  postComment,
};
const sampleData = {
  comment: 'what a cool comment',
};
describe('AddComment ', () => {
  const formHookMock = getFormMock(sampleData);

  beforeEach(() => {
    jest.resetAllMocks();
    useInsertTimelineMock.mockImplementation(() => defaultInsertTimeline);
    usePostCommentMock.mockImplementation(() => defaultPostCommment);
    useFormMock.mockImplementation(() => ({ form: formHookMock }));
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
  });

  it('should post comment on submit click', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <AddComment {...addCommentProps} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="add-comment"]`).exists()).toBeTruthy();
    expect(wrapper.find(`[data-test-subj="loading-spinner"]`).exists()).toBeFalsy();

    wrapper.find(`[data-test-subj="submit-comment"]`).first().simulate('click');
    await wait();
    expect(onCommentSaving).toBeCalled();
    expect(postComment).toBeCalledWith(sampleData, onCommentPosted);
    expect(formHookMock.reset).toBeCalled();
  });

  it('should render spinner and disable submit when loading', () => {
    usePostCommentMock.mockImplementation(() => ({ ...defaultPostCommment, isLoading: true }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <AddComment {...{ ...addCommentProps, showLoading: true }} />
        </Router>
      </TestProviders>
    );
    expect(wrapper.find(`[data-test-subj="loading-spinner"]`).exists()).toBeTruthy();
    expect(
      wrapper.find(`[data-test-subj="submit-comment"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });

  it('should disable submit button when disabled prop passed', () => {
    usePostCommentMock.mockImplementation(() => ({ ...defaultPostCommment, isLoading: true }));
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <AddComment {...{ ...addCommentProps, disabled: true }} />
        </Router>
      </TestProviders>
    );
    expect(
      wrapper.find(`[data-test-subj="submit-comment"]`).first().prop('isDisabled')
    ).toBeTruthy();
  });

  it('should insert a quote if one is available', () => {
    const sampleQuote = 'what a cool quote';
    mount(
      <TestProviders>
        <Router history={mockHistory}>
          <AddComment {...{ ...addCommentProps, insertQuote: sampleQuote }} />
        </Router>
      </TestProviders>
    );

    expect(formHookMock.setFieldValue).toBeCalledWith(
      'comment',
      `${sampleData.comment}\n\n${sampleQuote}`
    );
  });
});
