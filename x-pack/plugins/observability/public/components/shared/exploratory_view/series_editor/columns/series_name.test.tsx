/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockUxSeries, render } from '../../rtl_helpers';
import { SeriesName } from './series_name';

// ensures that fields appropriately match to their label
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  ...jest.requireActual('@elastic/eui/lib/services/accessibility/html_id_generator'),
  htmlIdGenerator: () => () => `id-${Math.random()}`,
}));

describe('SeriesName', function () {
  it('should render properly', async function () {
    render(<SeriesName seriesId={0} series={mockUxSeries} />);

    expect(screen.getByText(mockUxSeries.name)).toBeInTheDocument();
  });

  it('should display input when editing name', async function () {
    render(<SeriesName seriesId={0} series={mockUxSeries} />);

    let input = screen.queryByTestId('exploratoryViewSeriesNameInput') as HTMLInputElement;

    // read only
    expect(input).not.toBeInTheDocument();

    const editButton = screen.getByRole('button');
    // toggle editing
    fireEvent.click(editButton);

    await waitFor(() => {
      input = screen.getByTestId('exploratoryViewSeriesNameInput') as HTMLInputElement;

      expect(input).toBeInTheDocument();
      expect(input.value).toBe(mockUxSeries.name);
    });

    // toggle readonly
    fireEvent.click(editButton);

    await waitFor(() => {
      input = screen.queryByTestId('exploratoryViewSeriesNameInput') as HTMLInputElement;

      expect(screen.getByText(mockUxSeries.name)).toBeInTheDocument();
      expect(input).not.toBeInTheDocument();
    });
  });

  it('should save name on enter key', async function () {
    const newName = '-test-new-name';
    render(<SeriesName seriesId={0} series={mockUxSeries} />);

    let input = screen.queryByTestId('exploratoryViewSeriesNameInput') as HTMLInputElement;

    // read only
    expect(input).not.toBeInTheDocument();

    const editButton = screen.getByRole('button');
    // toggle editing
    userEvent.click(editButton);

    await waitFor(() => {
      input = screen.getByTestId('exploratoryViewSeriesNameInput') as HTMLInputElement;

      expect(input).toBeInTheDocument();
    });

    userEvent.click(input);
    userEvent.type(input, newName);

    // submit
    userEvent.keyboard('{enter}');

    await waitFor(() => {
      input = screen.queryByTestId('exploratoryViewSeriesNameInput') as HTMLInputElement;

      expect(screen.getByText(`${mockUxSeries.name}${newName}`)).toBeInTheDocument();
      expect(input).not.toBeInTheDocument();
    });
  });
});
