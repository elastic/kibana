/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { SeriesActions } from './series_actions';
import { mockUxSeries, render } from '../../rtl_helpers';

describe('SeriesActions', function () {
  it('should contain an edit button', function () {
    const { getByLabelText } = render(<SeriesActions seriesId={0} series={mockUxSeries} />);

    expect(getByLabelText('Edit series')).toBeInTheDocument();
  });

  it('should contain an actions button', function () {
    const { getByLabelText } = render(<SeriesActions seriesId={0} series={mockUxSeries} />);

    expect(getByLabelText('View series actions')).toBeInTheDocument();
  });

  describe('action context menu', function () {
    beforeEach(() => {
      render(<SeriesActions seriesId={0} series={mockUxSeries} />);

      const actionsButton = screen.getByLabelText('View series actions');
      userEvent.click(actionsButton);
    });

    it('should display the action list when the actions button is clicked', function () {
      expect(screen.getByLabelText('Series actions list')).toBeVisible();
    });

    it('should display a view transaction link', function () {
      expect(screen.getByLabelText('View transaction in Discover')).toBeVisible();
    });

    it('should display a hide series link', function () {
      expect(screen.getByLabelText('Hide series')).toBeVisible();
    });

    it('should display a duplicates series link', function () {
      expect(screen.getByLabelText('Duplicate series')).toBeVisible();
    });

    it('should display a remove series link', function () {
      expect(screen.getByLabelText('Remove series')).toBeVisible();
    });
  });
});
