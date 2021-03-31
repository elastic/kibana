/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockUrlStorage, render } from '../../rtl_helpers';
import { dataTypes, DataTypesCol } from './data_types_col';
import { NEW_SERIES_KEY } from '../../hooks/use_url_strorage';

describe('DataTypesCol', function () {
  it('should render properly', function () {
    const { getByText } = render(<DataTypesCol />);

    dataTypes.forEach(({ label }) => {
      getByText(label);
    });
  });

  it('should set series on change', function () {
    const { setSeries } = mockUrlStorage({});

    render(<DataTypesCol />);

    fireEvent.click(screen.getByText(/user experience\(rum\)/i));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith('newSeriesKey', { dataType: 'rum' });
  });

  it('should set series on change on already selected', function () {
    const { setSeries } = mockUrlStorage({
      data: {
        [NEW_SERIES_KEY]: {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<DataTypesCol />);

    const button = screen.getByRole('button', {
      name: /Synthetic Monitoring/i,
    });

    expect(button.classList).toContain('euiButton--fill');

    fireEvent.click(button);

    // undefined on click selected
    expect(setSeries).toHaveBeenCalledWith('newSeriesKey', { dataType: undefined });
  });
});
