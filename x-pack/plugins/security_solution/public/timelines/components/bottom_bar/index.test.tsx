/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProviders } from '../../../common/mock/test_providers';
import { timelineActions } from '../../store/timeline';
import { TimelineBottomBar } from '.';
import { useTimelineTitle } from '../../hooks/use_timeline_title';

jest.mock('../../hooks/use_timeline_title');
jest.mock('react-redux', () => {
  const origin = jest.requireActual('react-redux');
  return {
    ...origin,
    useDispatch: jest.fn().mockReturnValue(jest.fn()),
  };
});

const timelineId = 'timelineId';

describe('TimelineBottomBar', () => {
  test('should render bottom bar for an unsaved timeline', () => {
    (useTimelineTitle as jest.Mock).mockReturnValue('title');

    const { getByTestId } = render(
      <TestProviders>
        <TimelineBottomBar timelineId={timelineId} />
      </TestProviders>
    );

    expect(getByTestId('timeline-bottom-bar')).toBeInTheDocument();
    expect(getByTestId('timeline-event-count-badge')).toBeInTheDocument();
    expect(getByTestId('timeline-status')).toBeInTheDocument();
    expect(getByTestId('timeline-favorite-empty-star')).toBeInTheDocument();
  });

  test('should dispatch show action when clicking on the title', () => {
    const spy = jest.spyOn(timelineActions, 'showTimeline');

    const { getByTestId } = render(
      <TestProviders>
        <TimelineBottomBar timelineId={timelineId} />
      </TestProviders>
    );

    getByTestId('timeline-bottom-bar-title-button').click();

    expect(spy).toHaveBeenCalledWith({
      id: timelineId,
      show: true,
    });
  });
});
