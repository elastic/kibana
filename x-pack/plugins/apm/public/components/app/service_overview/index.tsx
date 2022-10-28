/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroupProps } from '@elastic/eui';
import { isMobileAgentName } from '../../../../common/agent_name';
import { AnnotationsContextProvider } from '../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../context/chart_pointer_event/chart_pointer_event_context';
import { useBreakpoints } from '../../../hooks/use_breakpoints';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { ServiceOverviewCharts } from './service_overview_charts/service_overview_charts';
import { ServiceOverviewMobileCharts } from './service_overview_charts/service_oveview_mobile_charts';

/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */
export const chartHeight = 288;

export function ServiceOverview() {
  const { agentName, serviceName } = useApmServiceContext();

  const {
    query: { environment, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  // The default EuiFlexGroup breaks at 768, but we want to break at 1200, so we
  // observe the window width and set the flex directions of rows accordingly
  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const latencyChartHeight = 200;
  const nonLatencyChartHeight = isSingleColumn
    ? latencyChartHeight
    : chartHeight;
  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn
    ? 'column'
    : 'row';

  const isMobileAgent = isMobileAgentName(agentName);

  const serviceOverviewProps = {
    latencyChartHeight,
    rowDirection,
    nonLatencyChartHeight,
    isSingleColumn,
  };

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      <ChartPointerEventContextProvider>
        {isMobileAgent ? (
          <ServiceOverviewMobileCharts {...serviceOverviewProps} />
        ) : (
          <ServiceOverviewCharts {...serviceOverviewProps} />
        )}
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
