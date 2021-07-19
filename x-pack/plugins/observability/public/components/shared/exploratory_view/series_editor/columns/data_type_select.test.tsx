/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockAppIndexPattern, mockUxSeries, render } from '../../rtl_helpers';
import { DataTypesLabels, DataTypesSelect } from './data_type_select';
import { DataTypes } from '../../configurations/constants';

describe('DataTypeSelect', function () {
  const seriesId = 0;

  mockAppIndexPattern();

  it('should render properly', function () {
    render(<DataTypesSelect seriesId={seriesId} series={mockUxSeries} />);
  });

  it('should set series on change', async function () {
    const { setSeries } = render(<DataTypesSelect seriesId={seriesId} series={mockUxSeries} />);

    fireEvent.click(await screen.findByText(DataTypesLabels[DataTypes.UX]));
    fireEvent.click(await screen.findByText(DataTypesLabels[DataTypes.SYNTHETICS]));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      breakdown: 'user_agent.name',
      dataType: 'synthetics',
      name: 'performance-distribution',
      reportDefinitions: {},
      time: {
        from: 'now-15m',
        to: 'now',
      },
    });
  });
});
