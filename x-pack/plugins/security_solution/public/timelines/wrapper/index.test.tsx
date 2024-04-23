/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../common/mock/react_beautiful_dnd';
import { TestProviders } from '../../common/mock';
import { TimelineId } from '../../../common/types/timeline';
import * as timelineActions from '../store/actions';
import { TimelineWrapper } from '.';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../components/timeline', () => ({
  StatefulTimeline: () => <div />,
}));
jest.mock('../../common/hooks/timeline/use_timeline_save_prompt');

describe('TimelineWrapper', () => {
  const props = {
    onAppLeave: jest.fn(),
    timelineId: TimelineId.test,
  };

  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('should render correctly the main timeline elements', () => {
    const { getByTestId } = render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );
    expect(getByTestId('timeline-portal-ref')).toBeInTheDocument();
    expect(getByTestId('timeline-bottom-bar')).toBeInTheDocument();
  });

  it('should render the default timeline state as a bottom bar', () => {
    const { getByText } = render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );

    expect(getByText('Untitled timeline')).toBeInTheDocument();
  });

  it('should show timeline when bottom bar button is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );

    userEvent.click(getByTestId('timeline-bottom-bar-title-button'));

    expect(mockDispatch).toBeCalledWith(
      timelineActions.showTimeline({ id: TimelineId.test, show: true })
    );
  });

  it('should hide timeline when user presses keyboard esc key', () => {
    render(
      <TestProviders>
        <TimelineWrapper {...props} />
      </TestProviders>
    );

    userEvent.keyboard('{Escape}');

    expect(mockDispatch).toBeCalledWith(
      timelineActions.showTimeline({ id: TimelineId.test, show: false })
    );
  });
});
