/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import {
  ATTACH_TO_TIMELINE_CALLOUT_TEST_ID,
  ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID,
} from './test_ids';
import { AttachToActiveTimeline } from './attach_to_active_timeline';

const mockTimelineId = 'timelineId';
const mockSetTimelineId = jest.fn();

describe('AttachToActiveTimeline', () => {
  it('should render the callout and checkbox components', () => {
    const { getByTestId, getByText } = render(
      <AttachToActiveTimeline
        timelineId={mockTimelineId}
        setTimelineId={mockSetTimelineId}
        isCheckboxDisabled={false}
      />
    );
    expect(getByTestId(ATTACH_TO_TIMELINE_CALLOUT_TEST_ID)).toBeInTheDocument();
    expect(getByText('Attach to timeline')).toBeInTheDocument();
    expect(
      getByText('Before attaching this to timeline you should save the Timeline.')
    ).toBeInTheDocument();
    expect(getByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).toBeInTheDocument();
  });

  it('should have the checkbox checked', () => {
    const { getByTestId } = render(
      <AttachToActiveTimeline
        timelineId={mockTimelineId}
        setTimelineId={mockSetTimelineId}
        isCheckboxDisabled={false}
      />
    );

    expect(getByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).toHaveProperty('checked');
  });

  it('should have the checkbox disabled', () => {
    const { getByTestId } = render(
      <AttachToActiveTimeline
        timelineId={mockTimelineId}
        setTimelineId={mockSetTimelineId}
        isCheckboxDisabled={true}
      />
    );

    expect(getByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID)).toHaveProperty('disabled');
  });

  it('should call the callback when user click on the checkbox', () => {
    const { getByTestId } = render(
      <AttachToActiveTimeline
        timelineId={mockTimelineId}
        setTimelineId={mockSetTimelineId}
        isCheckboxDisabled={false}
      />
    );

    const checkbox = getByTestId(ATTACH_TO_TIMELINE_CHECKBOX_TEST_ID);

    checkbox.click();

    expect(mockSetTimelineId).toHaveBeenCalledWith('');

    checkbox.click();

    expect(mockSetTimelineId).toHaveBeenCalledWith(mockTimelineId);
  });
});
