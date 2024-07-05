/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroupProps, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { AnnotationsContextProvider } from '../../../../context/annotations/annotations_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { ChartPointerEventContextProvider } from '../../../../context/chart_pointer_event/chart_pointer_event_context';
import { useBreakpoints } from '../../../../hooks/use_breakpoints';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { AddAPMCallOut } from './add_apm_callout';
import { LogRateChart } from '../charts/log_rate_chart';
import { LogErrorRateChart } from '../charts/log_error_rate_chart';
/**
 * The height a chart should be if it's next to a table with 5 rows and a title.
 * Add the height of the pagination row.
 */

const chartHeight = 400;

export function LogsServiceOverview() {
  const { serviceName } = useApmServiceContext();

  const {
    query: { environment, rangeFrom, rangeTo },
  } = useApmParams('/logs-services/{serviceName}/overview');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { isLarge } = useBreakpoints();
  const isSingleColumn = isLarge;

  const rowDirection: EuiFlexGroupProps['direction'] = isSingleColumn ? 'column' : 'row';

  return (
    <AnnotationsContextProvider
      serviceName={serviceName}
      environment={environment}
      start={start}
      end={end}
    >
      <ChartPointerEventContextProvider>
        <AddAPMCallOut />
        <EuiSpacer size="l" />

        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction={rowDirection} gutterSize="s" responsive={false}>
              <EuiFlexItem grow={4}>
                <LogRateChart height={chartHeight} />
              </EuiFlexItem>
              <EuiFlexItem grow={4}>
                <LogErrorRateChart height={chartHeight} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ChartPointerEventContextProvider>
    </AnnotationsContextProvider>
  );
}
