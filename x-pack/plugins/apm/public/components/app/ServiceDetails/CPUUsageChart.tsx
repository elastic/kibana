/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Coordinate } from '../../../../typings/timeseries';
import { CPUMetricSeries } from '../../../store/selectors/chartSelectors';
import { asPercent } from '../../../utils/formatters';
// @ts-ignore
import CustomPlot from '../../shared/charts/CustomPlot';
import { HoverXHandlers } from '../../shared/charts/SyncChartGroup';

interface Props {
  data: CPUMetricSeries;
  hoverXHandlers: HoverXHandlers;
}

const tickFormatY = (y: number | null) => `${(y || 0) * 100}%`;
const formatTooltipValue = (c: Coordinate) => asPercent(c.y || 0, 1);

export function CPUUsageChart({ data, hoverXHandlers }: Props) {
  return (
    <React.Fragment>
      <EuiTitle size="xs">
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
        tickFormatY={tickFormatY}
        formatTooltipValue={formatTooltipValue}
        yMax={1}
      />
    </React.Fragment>
  );
}
