/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { TestProviders } from '../../../../common/mock/test_providers';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { FlyoutBottomBar } from '.';

describe('FlyoutBottomBar', () => {
  test('it renders the expected bottom bar', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={true}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('flyoutBottomBar')).toBeInTheDocument();
  });

  test('it renders the data providers drop target area', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={true}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('dataProviders')).toBeInTheDocument();
  });

  test('it renders the flyout header panel', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={true}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('timeline-flyout-header-panel')).toBeInTheDocument();
  });

  test('it hides the data providers drop target area', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={false}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('dataProviders')).not.toBeInTheDocument();
  });

  test('it hides the flyout header panel', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={false}
          activeTab={TimelineTabs.query}
        />
      </TestProviders>
    );

    expect(screen.queryByTestId('timeline-flyout-header-panel')).not.toBeInTheDocument();
  });

  test('it renders the data providers drop target area when showDataproviders=false and tab is not query', () => {
    render(
      <TestProviders>
        <FlyoutBottomBar
          timelineId="test"
          showDataproviders={false}
          activeTab={TimelineTabs.notes}
        />
      </TestProviders>
    );

    expect(screen.getByTestId('dataProviders')).toBeInTheDocument();
  });
});
