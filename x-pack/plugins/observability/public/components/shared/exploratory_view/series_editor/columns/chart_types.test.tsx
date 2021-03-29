/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { SeriesChartTypes, XYChartTypes } from './chart_types';
import { mockUrlStorage, render } from '../../rtl_helpers';

describe('SeriesChartTypes', function () {
  it('should render properly', async function () {
    mockUrlStorage({});

    render(<SeriesChartTypes seriesId={'series-id'} defaultChartType={'line'} />);

    screen.getByText(/chart type/i);
  });

  describe('XYChartTypes', function () {
    it('should render properly', async function () {
      mockUrlStorage({});

      render(<XYChartTypes value={'line'} onChange={jest.fn()} label={'Chart type'} />);

      screen.getByText(/chart type/i);
    });
  });
});
