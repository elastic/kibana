/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { Router, mockHistory } from '../__mock__/router';
import { UserActionMarkdown } from './user_action_markdown';
import { TestProviders } from '../../../common/mock';
import * as timelineHelpers from '../../../timelines/components/open_timeline/helpers';
import { useApolloClient } from '../../../common/utils/apollo_context';
const mockUseApolloClient = useApolloClient as jest.Mock;
jest.mock('../../../common/utils/apollo_context');
const onChangeEditable = jest.fn();
const onSaveContent = jest.fn();

const timelineId = '1e10f150-949b-11ea-b63c-2bc51864784c';
const defaultProps = {
  content: `A link to a timeline [timeline](http://localhost:5601/app/security/timelines?timeline=(id:'${timelineId}',isOpen:!t))`,
  id: 'markdown-id',
  isEditable: false,
  onChangeEditable,
  onSaveContent,
};

describe('UserActionMarkdown ', () => {
  const queryTimelineByIdSpy = jest.spyOn(timelineHelpers, 'queryTimelineById');
  beforeEach(() => {
    mockUseApolloClient.mockClear();
    jest.resetAllMocks();
  });

  it('Opens timeline when timeline link clicked - isEditable: false', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <UserActionMarkdown {...defaultProps} />
        </Router>
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="markdown-timeline-link"]`).first().simulate('click');

    expect(queryTimelineByIdSpy).toBeCalledWith({
      apolloClient: mockUseApolloClient(),
      graphEventId: '',
      timelineId,
      updateIsLoading: expect.any(Function),
      updateTimeline: expect.any(Function),
    });
  });

  it('Opens timeline when timeline link clicked - isEditable: true ', async () => {
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <UserActionMarkdown {...{ ...defaultProps, isEditable: true }} />
        </Router>
      </TestProviders>
    );
    wrapper.find(`[data-test-subj="preview-tab"]`).first().simulate('click');
    wrapper.find(`[data-test-subj="markdown-timeline-link"]`).first().simulate('click');
    expect(queryTimelineByIdSpy).toBeCalledWith({
      apolloClient: mockUseApolloClient(),
      graphEventId: '',
      timelineId,
      updateIsLoading: expect.any(Function),
      updateTimeline: expect.any(Function),
    });
  });
});
