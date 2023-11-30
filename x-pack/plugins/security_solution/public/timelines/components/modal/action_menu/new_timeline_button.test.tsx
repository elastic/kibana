/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { NewTimelineButton } from './new_timeline_button';
import { TimelineId } from '../../../../../common/types';

const renderNewTimelineButton = () =>
  render(
    <TestProviders>
      <NewTimelineButton timelineId={TimelineId.test} />
    </TestProviders>
  );

describe('NewTimelineButton', () => {
  it('should render the button', async () => {
    const { getByText } = renderNewTimelineButton();

    expect(getByText('New')).toBeInTheDocument();
  });

  it('should render 2 options when clicking on the button', async () => {
    const { getByTestId, getByText } = renderNewTimelineButton();

    getByTestId('new-timeline-button').click();

    expect(getByText('New Timeline')).toBeInTheDocument();
    expect(getByText('New Timeline template')).toBeInTheDocument();
  });
});
