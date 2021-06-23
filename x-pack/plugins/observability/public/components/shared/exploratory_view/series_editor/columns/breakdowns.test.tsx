/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { Breakdowns } from './breakdowns';
import { mockIndexPattern, render } from '../../rtl_helpers';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { USER_AGENT_OS } from '../../configurations/constants/elasticsearch_fieldnames';

describe('Breakdowns', function () {
  const dataViewSeries = getDefaultConfigs({
    reportType: 'dist',
    indexPattern: mockIndexPattern,
    dataType: 'ux',
  });

  it('should render properly', async function () {
    render(
      <Breakdowns
        seriesId={'series-id'}
        breakdowns={dataViewSeries.breakdowns}
        reportViewConfig={dataViewSeries}
      />
    );

    screen.getAllByText('Browser family');
  });

  it('should call set series on change', function () {
    const initSeries = { breakdown: USER_AGENT_OS };

    const { setSeries } = render(
      <Breakdowns
        seriesId={'series-id'}
        breakdowns={dataViewSeries.breakdowns}
        reportViewConfig={dataViewSeries}
      />,
      { initSeries }
    );

    screen.getAllByText('Operating system');

    fireEvent.click(screen.getByTestId('seriesBreakdown'));

    fireEvent.click(screen.getByText('Browser family'));

    expect(setSeries).toHaveBeenCalledWith('series-id', {
      breakdown: 'user_agent.name',
      dataType: 'ux',
      reportType: 'dist',
      time: { from: 'now-15m', to: 'now' },
    });
    expect(setSeries).toHaveBeenCalledTimes(1);
  });
});
