/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { mockIndexPattern, render } from '../../rtl_helpers';
import { ReportFilters } from './report_filters';

describe('ReportFilters', () => {
  it('renders', async () => {
    const seriesId = 'test-series-id';

    const dataViewSeries = getDefaultConfigs({
      reportType: 'data-distribution',
      indexPattern: mockIndexPattern,
      dataType: 'ux',
    });

    render(<ReportFilters seriesConfig={dataViewSeries} seriesId={seriesId} />);

    await waitFor(() => {
      expect(screen.getByText('Add filter')).toBeInTheDocument();
    });
  });
});
