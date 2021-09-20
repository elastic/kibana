/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { PickEventType } from './pick_events';
import { mockSourcererState, TestProviders } from '../../../../common/mock';
import { TimelineEventsType } from '../../../../../common';

describe('Pick Events/Timeline Sourcerer', () => {
  const defaultProps = {
    eventType: 'all' as TimelineEventsType,
    onChangeEventTypeAndIndexesName: jest.fn(),
  };
  it('renders', () => {
    const wrapper = render(
      <TestProviders>
        <PickEventType {...defaultProps} />
      </TestProviders>
    );
    fireEvent.click(wrapper.getByTestId('sourcerer-timeline-trigger'));
    expect(wrapper.getByTestId('timeline-sourcerer').textContent).toEqual(
      mockSourcererState.defaultDataView.patternList.sort().join('')
    );
  });
});
