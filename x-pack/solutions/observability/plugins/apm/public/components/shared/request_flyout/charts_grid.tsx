/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { getTimeZone } from '../charts/helper/timezone';
import { TimeseriesChart } from '../charts/timeseries_chart';
import { CHART_HEIGHT, ChartPanel, HIDE_LEGEND_SETTINGS, useChartsGridCss } from './chart_panel';
import { useRequestFlyoutContext } from './request_flyout_context';

type TimeseriesChartProps = React.ComponentProps<typeof TimeseriesChart>;

export interface RequestFlyoutChart {
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  titleTip?: React.ReactNode;
  fetchStatus: TimeseriesChartProps['fetchStatus'];
  timeseries: TimeseriesChartProps['timeseries'];
  yLabelFormat: TimeseriesChartProps['yLabelFormat'];
  yDomain?: TimeseriesChartProps['yDomain'];
}

/** The metric charts of a request flyout, one panel per chart, in a responsive grid. */
export function RequestFlyoutChartsGrid({ charts }: { charts: RequestFlyoutChart[] }) {
  const {
    deps: { core },
  } = useRequestFlyoutContext();
  const timeZone = getTimeZone(core.uiSettings);
  const chartsGridCss = useChartsGridCss();

  return (
    <ChartPointerEventContextProvider>
      <div css={chartsGridCss}>
        {charts.map(({ id, title, titleAction, titleTip, ...chart }) => (
          <ChartPanel key={id} id={id} title={title} titleAction={titleAction} titleTip={titleTip}>
            <TimeseriesChart
              {...chart}
              id={id}
              height={CHART_HEIGHT}
              settings={HIDE_LEGEND_SETTINGS}
              comparisonEnabled={false}
              timeZone={timeZone}
              showAnnotations={false}
            />
          </ChartPanel>
        ))}
      </div>
    </ChartPointerEventContextProvider>
  );
}
