/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { ReportFilters } from './report_filters';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { mockIndexPattern, render } from '../../rtl_helpers';

describe('Series Builder ReportFilters', function () {
  const seriesId = 'test-series-id';

  const dataViewSeries = getDefaultConfigs({
    seriesId,
    reportType: 'dist',
    indexPattern: mockIndexPattern,
  });

  it('should render properly', function () {
    render(<ReportFilters dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    screen.getByText('Add filter');
  });
});
