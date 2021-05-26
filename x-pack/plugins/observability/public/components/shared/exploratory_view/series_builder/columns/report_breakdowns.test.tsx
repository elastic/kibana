/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { render } from '../../../../../utils/test_helper';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { mockIndexPattern, mockUrlStorage } from '../../rtl_helpers';
import { ReportBreakdowns } from './report_breakdowns';
import { USER_AGENT_OS } from '../../configurations/constants/elasticsearch_fieldnames';

describe('Series Builder ReportBreakdowns', function () {
  const seriesId = 'test-series-id';
  const dataViewSeries = getDefaultConfigs({
    seriesId,
    reportType: 'pld',
    indexPattern: mockIndexPattern,
  });

  it('should render properly', function () {
    mockUrlStorage({});

    render(<ReportBreakdowns dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    screen.getByText('Select an option: , is selected');
    screen.getAllByText('Browser family');
  });

  it('should set new series breakdown on change', function () {
    const { setSeries } = mockUrlStorage({});

    render(<ReportBreakdowns dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    const btn = screen.getByRole('button', {
      name: /select an option: Browser family , is selected/i,
      hidden: true,
    });

    fireEvent.click(btn);

    fireEvent.click(screen.getByText(/operating system/i));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      breakdown: USER_AGENT_OS,
      dataType: 'ux',
      reportType: 'pld',
      time: { from: 'now-15m', to: 'now' },
    });
  });
  it('should set undefined on new series on no select breakdown', function () {
    const { setSeries } = mockUrlStorage({});

    render(<ReportBreakdowns dataViewSeries={dataViewSeries} seriesId={seriesId} />);

    const btn = screen.getByRole('button', {
      name: /select an option: Browser family , is selected/i,
      hidden: true,
    });

    fireEvent.click(btn);

    fireEvent.click(screen.getByText(/no breakdown/i));

    expect(setSeries).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledWith(seriesId, {
      breakdown: undefined,
      dataType: 'ux',
      reportType: 'pld',
      time: { from: 'now-15m', to: 'now' },
    });
  });
});
