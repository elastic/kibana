/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useChartTheme } from '../../../../../observability/public';
import { ProfilingValueType } from '../../../../common/profiling';

type ProfilingTimelineItem = {
  x: number;
  count: number;
} & { valueTypes: Record<ProfilingValueType, number> };

export function ServiceProfilingTimeline({
  start,
  end,
  profiles,
}: {
  profiles: ProfilingTimelineItem[];
  start?: number;
  end?: number;
}) {
  const chartTheme = useChartTheme();

  const xFormat = niceTimeFormatter([start!, end!]);

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <Chart size={{ width: '100%', height: 120 }}>
          <Settings theme={chartTheme} />
          <Axis id="time" position={Position.Bottom} tickFormat={xFormat} />
          <Axis id="count" position={Position.Left} />
          <BarSeries
            id="profiles_over_time"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="x"
            yAccessors={[
              'count',
              (d) => d.valueTypes[ProfilingValueType.cpuTime],
              (d) => d.valueTypes[ProfilingValueType.wallTime],
            ]}
            data={profiles}
          />
        </Chart>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
