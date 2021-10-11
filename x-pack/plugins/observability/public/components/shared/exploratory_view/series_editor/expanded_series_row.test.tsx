/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ExpandedSeriesRow } from './expanded_series_row';
import { mockIndexPattern, mockUxSeries, render } from '../rtl_helpers';
import { getDefaultConfigs } from '../configurations/default_configs';
import { PERCENTILE } from '../configurations/constants';

describe('ExpandedSeriesRow', function () {
  const dataViewSeries = getDefaultConfigs({
    reportType: 'kpi-over-time',
    indexPattern: mockIndexPattern,
    dataType: 'ux',
  });

  it('should render properly', async function () {
    render(<ExpandedSeriesRow seriesId={0} seriesConfig={dataViewSeries} series={mockUxSeries} />);

    expect(screen.getByText('Breakdown by')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
  });

  it('should not display operation field when percentile breakdowns are applied', async function () {
    render(
      <ExpandedSeriesRow
        seriesId={0}
        seriesConfig={{ ...dataViewSeries, hasOperationType: true }}
        series={{ ...mockUxSeries, breakdown: PERCENTILE }}
      />
    );

    expect(screen.queryByText('Operation')).toBeInTheDocument();
  });
});
