/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockAppIndexPattern, mockUrlStorage, render } from '../../rtl_helpers';
import { dataTypes, DataTypesCol } from './data_types_col';

describe('DataTypesCol', function () {
  const seriesId = 'test-series-id';

  mockAppIndexPattern();

  it('should render properly', function () {
    const { getByText } = render(<DataTypesCol seriesId={seriesId} />);

    dataTypes.forEach(({ label }) => {
      getByText(label);
    });
  });

  it('should set series on change', function () {
    const { setSeries } = mockUrlStorage({});

    render(<DataTypesCol seriesId={seriesId} />);

    fireEvent.click(screen.getByText(/user experience \(rum\)/i));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, { dataType: 'ux' });
  });

  it('should set series on change on already selected', function () {
    mockUrlStorage({
      data: {
        [seriesId]: {
          dataType: 'synthetics',
          reportType: 'upp',
          breakdown: 'monitor.status',
          time: { from: 'now-15m', to: 'now' },
        },
      },
    });

    render(<DataTypesCol seriesId={seriesId} />);

    const button = screen.getByRole('button', {
      name: /Synthetic Monitoring/i,
    });

    expect(button.classList).toContain('euiButton--fill');
  });
});
