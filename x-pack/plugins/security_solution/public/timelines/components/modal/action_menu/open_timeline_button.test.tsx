/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { TestProviders } from '../../../../common/mock';
import React from 'react';
import { OpenTimelineButton } from './open_timeline_button';

describe('OpenTimelineButton', () => {
  it('should render the button', async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <TestProviders>
        <OpenTimelineButton />
      </TestProviders>
    );

    expect(getByTestId('open-timeline-button')).toBeInTheDocument();
    expect(getByText('Open')).toBeInTheDocument();
    expect(queryByTestId('open-timeline-modal')).not.toBeInTheDocument();
  });
});
