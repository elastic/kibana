/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import CustomPlot from 'x-pack/plugins/apm/public/components/shared/charts/CustomPlot';
import { HoverXHandlers } from 'x-pack/plugins/apm/public/components/shared/charts/SyncChartGroup';
import { asPercent } from 'x-pack/plugins/apm/public/utils/formatters';
import { CPUChartAPIResponse } from 'x-pack/plugins/apm/server/lib/metrics/get_cpu_chart_data/transformer';
import { Coordinate } from 'x-pack/plugins/apm/typings/timeseries';

interface Props {
  data: CPUChartAPIResponse;
  hoverXHandlers: HoverXHandlers;
}

export function CPUUsageChart({ data, hoverXHandlers }: Props) {
  return (
    <React.Fragment>
      <EuiTitle size="s">
        <span>
          {i18n.translate(
            'xpack.apm.serviceDetails.metrics.cpuUsageChartTitle',
            {
              defaultMessage: 'CPU usage'
            }
          )}
        </span>
      </EuiTitle>
      <CustomPlot
        {...hoverXHandlers}
        noHits={data.totalHits === 0}
        series={data.series}
        tickFormatY={(y: number | null) => `${(y || 0) * 100}%`}
        formatTooltipValue={(c: Coordinate) => asPercent(c.y || 0)}
        yMax={1}
      />
    </React.Fragment>
  );
}
