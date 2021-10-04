/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { mockUxSeries, render } from '../../rtl_helpers';
import { SeriesName } from './series_name';

describe.skip('SeriesChartTypesSelect', function () {
  it('should render properly', async function () {
    render(<SeriesName seriesId={0} series={mockUxSeries} />);

    expect(screen.getByText(mockUxSeries.name)).toBeInTheDocument();
  });

  it('should display input when editing name', async function () {
    render(<SeriesName seriesId={0} series={mockUxSeries} />);

    let input = screen.queryByLabelText(mockUxSeries.name);

    // read only
    expect(input).not.toBeInTheDocument();

    const editButton = screen.getByRole('button');
    // toggle editing
    fireEvent.click(editButton);

    await waitFor(() => {
      input = screen.getByLabelText(mockUxSeries.name);

      expect(input).toBeInTheDocument();
    });

    // toggle readonly
    fireEvent.click(editButton);

    await waitFor(() => {
      input = screen.getByLabelText(mockUxSeries.name);

      expect(input).not.toBeInTheDocument();
    });
  });
});
