/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useMemo } from 'react';
import { useEuiTheme, formatDate } from '@elastic/eui';
import { Axis, BarSeries, Chart, ScaleType, Settings, Position } from '@elastic/charts';
import { ClientPluginsStart } from '../../../../../../../plugin';
import { ERRORS_LABEL } from '../../../../monitor_details/monitor_summary/monitor_errors_count';

interface Props {
  from: string;
  to: string;
  monitorIds: string[];
  locations?: string[];
  histogram: Array<{ x: number; y: number }>;
}
export const OverviewErrorsSparklines = ({ from, to, monitorIds, locations, histogram }: Props) => {
  const { charts } = useKibana<ClientPluginsStart>().services;

  const baseTheme = charts.theme.useChartsBaseTheme();

  const { euiTheme } = useEuiTheme();

  const time = useMemo(() => ({ from, to }), [from, to]);

  return (
    <>
      <Chart
        size={{
          height: 70,
        }}
      >
        <Settings baseTheme={baseTheme} />
        <Axis
          id="bottomAxis"
          position={Position.Bottom}
          tickFormat={(d: any) => formatDate(d, 'LTS')}
          style={{
            tickLabel: {
              visible: false,
            },
          }}
        />
        <Axis
          id="leftAxis"
          position={Position.Left}
          style={{
            tickLabel: {
              visible: false,
            },
          }}
        />
        <BarSeries
          id="errorsSparklines"
          name={ERRORS_LABEL}
          xScaleType={ScaleType.Linear}
          yScaleType={ScaleType.Linear}
          xAccessor="x"
          yAccessors={['y']}
          data={histogram}
          color={euiTheme.colors.danger}
        />
      </Chart>
    </>
  );
};
