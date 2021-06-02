/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../../../utils/test_helper';
import { ReportFilters } from './report_filters';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { mockIndexPattern, mockUrlStorage } from '../../rtl_helpers';

describe('Series Builder ReportFilters', function () {
  const seriesId = 'test-series-id';

  const dataViewSeries = getDefaultConfigs({
    seriesId,
    reportType: 'pld',
    indexPattern: mockIndexPattern,
  });
  mockUrlStorage({});
  it('should render properly', function () {
    render(<ReportFilters dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    screen.getByText('Add filter');
  });
});
