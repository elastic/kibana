/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { TreemapChart } from '.';

describe('TreemapChart', () => {
  it('renders an empty state when the fetch succeeded but returned no data', () => {
    const { getByTestId, queryByTestId } = render(
      <TreemapChart data={[]} height={320} fetchStatus={FETCH_STATUS.SUCCESS} id="device-treemap" />
    );

    expect(getByTestId('treemapNoResultsFound')).toBeInTheDocument();
    // The empty-state replaces the chart, so the chart container children are not rendered
    expect(queryByTestId('device-treemap')).toBeInTheDocument();
  });

  it('renders the chart when data is available', () => {
    const { queryByTestId } = render(
      <TreemapChart
        data={[{ label: 'iPhone', count: 10 }]}
        height={320}
        fetchStatus={FETCH_STATUS.SUCCESS}
        id="device-treemap"
      />
    );

    expect(queryByTestId('treemapNoResultsFound')).not.toBeInTheDocument();
  });

  it('does not render the empty state while loading', () => {
    const { queryByTestId } = render(
      <TreemapChart data={[]} height={320} fetchStatus={FETCH_STATUS.LOADING} id="device-treemap" />
    );

    expect(queryByTestId('treemapNoResultsFound')).not.toBeInTheDocument();
  });
});
