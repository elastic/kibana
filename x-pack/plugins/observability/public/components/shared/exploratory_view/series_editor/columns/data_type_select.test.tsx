/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { mockAppDataView, mockUxSeries, render } from '../../rtl_helpers';
import { DataTypesSelect } from './data_type_select';
import { DataTypes } from '../../configurations/constants';
import { DataTypesLabels } from '../../obsv_exploratory_view';

describe('DataTypeSelect', function () {
  const seriesId = 0;

  mockAppDataView();

  it('should render properly', function () {
    render(<DataTypesSelect seriesId={seriesId} series={mockUxSeries} />);
  });

  it('should set series on change', async function () {
    const seriesWithoutDataType = {
      ...mockUxSeries,
      dataType: undefined,
    };
    const { setSeries } = render(
      <DataTypesSelect seriesId={seriesId} series={seriesWithoutDataType} />
    );

    fireEvent.click(await screen.findByText('Select data type'));
    fireEvent.click(await screen.findByText(DataTypesLabels[DataTypes.SYNTHETICS]));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      dataType: 'synthetics',
      name: 'synthetics-series-1',
      time: {
        from: 'now-15m',
        to: 'now',
      },
    });
  });
});
