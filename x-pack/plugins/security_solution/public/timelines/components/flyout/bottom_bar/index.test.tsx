/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { FlyoutBottomBar } from '.';

describe('FlyoutBottomBar', () => {
  test('it renders the expected bottom bar', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" showTimelineHeaderPanel={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('flyoutBottomBar')).toBeInTheDocument();
  });

  test('it renders the flyout header panel', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" showTimelineHeaderPanel={true} />
      </TestProviders>
    );

    expect(screen.getByTestId('timeline-flyout-header-panel')).toBeInTheDocument();
  });

  test('it hides the flyout header panel', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar timelineId="test" showTimelineHeaderPanel={false} />
      </TestProviders>
    );

    expect(screen.queryByTestId('timeline-flyout-header-panel')).not.toBeInTheDocument();
  });
});
