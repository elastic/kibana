/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { TimelineId } from '../../../../../common/types/timeline';
import { Pane } from '.';

jest.mock('../../timeline', () => ({
  StatefulTimeline: () => <div data-test-subj="StatefulTimelineMock" />,
}));

const mockIsFullScreen = jest.fn(() => false);
jest.mock('../../../../common/store/selectors', () => ({
  inputsSelectors: { timelineFullScreenSelector: () => mockIsFullScreen() },
}));

describe('Pane', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the timeline', async () => {
    const wrapper = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(wrapper.getByTestId('StatefulTimelineMock')).toBeInTheDocument();
  });

  it('should render without fullscreen className', async () => {
    mockIsFullScreen.mockReturnValue(false);
    const wrapper = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(wrapper.getByTestId('timeline-wrapper')).not.toHaveClass(
      'timeline-wrapper--full-screen'
    );
  });

  it('should render with fullscreen className', async () => {
    mockIsFullScreen.mockReturnValue(true);
    const wrapper = render(
      <TestProviders>
        <Pane timelineId={TimelineId.test} />
      </TestProviders>
    );

    expect(wrapper.getByTestId('timeline-wrapper')).toHaveClass('timeline-wrapper--full-screen');
  });
});
