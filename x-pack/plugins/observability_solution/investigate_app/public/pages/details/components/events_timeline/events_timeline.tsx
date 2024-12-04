/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AreaSeries, Axis, Chart, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiSkeletonText } from '@elastic/eui';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { getBrushData } from '@kbn/observability-utils-browser/chart/utils';
import { assertNever } from '@kbn/std';
import moment from 'moment';
import React, { useMemo, useRef } from 'react';
import { useFetchEvents } from '../../../../hooks/use_fetch_events';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';
import { AlertEvent } from './alert_event';
import { AnnotationEvent } from './annotation_event';
import { TIMELINE_THEME } from './timeline_theme';

interface Props {
  eventTypes: string[];
}

export const EventsTimeline = ({ eventTypes }: Props) => {
  const { dependencies } = useKibana();
  const baseTheme = dependencies.start.charts.theme.useChartsBaseTheme();
  const { globalParams, updateInvestigationParams } = useInvestigation();
  const chartRef = useRef(null);

  const { data: events, isLoading } = useFetchEvents({
    rangeFrom: globalParams.timeRange.from,
    rangeTo: globalParams.timeRange.to,
    eventTypes,
  });

  const handleCursorUpdate = useActiveCursor(dependencies.start.charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  const data = useMemo(() => {
    const points = [
      { x: moment(globalParams.timeRange.from).valueOf(), y: 0 },
      { x: moment(globalParams.timeRange.to).valueOf(), y: 0 },
    ];

    // adding 100 fake points to the chart so the chart shows cursor on hover
    for (let i = 0; i < 100; i++) {
      const diff =
        moment(globalParams.timeRange.to).valueOf() - moment(globalParams.timeRange.from).valueOf();
      points.push({ x: moment(globalParams.timeRange.from).valueOf() + (diff / 100) * i, y: 0 });
    }
    return points;
  }, [globalParams.timeRange.from, globalParams.timeRange.to]);

  if (isLoading) {
    return <EuiSkeletonText />;
  }

  return (
    <Chart size={['100%', 64]} ref={chartRef}>
      <Settings
        xDomain={{
          min: moment(globalParams.timeRange.from).valueOf(),
          max: moment(globalParams.timeRange.to).valueOf(),
        }}
        theme={TIMELINE_THEME}
        baseTheme={baseTheme}
        onPointerUpdate={handleCursorUpdate}
        externalPointerEvents={{
          tooltip: { visible: true },
        }}
        onBrushEnd={(brush) => {
          const { from, to } = getBrushData(brush);
          updateInvestigationParams({
            timeRange: { from, to },
          });
        }}
      />
      <Axis id="y" position={Position.Left} hide />
      <Axis
        id="x"
        position={Position.Bottom}
        tickFormat={(d) => moment(d).format('LTS')}
        style={{
          tickLine: {
            visible: true,
            strokeWidth: 1,
            stroke: '#98A2B3',
          },
        }}
      />

      {events?.map((event) => {
        if (event.eventType === 'alert') {
          return <AlertEvent key={event.id} event={event} />;
        }
        if (event.eventType === 'annotation') {
          return <AnnotationEvent key={event.id} event={event} />;
        }
        assertNever(event);
      })}

      <AreaSeries
        id="Time"
        xScaleType={ScaleType.Time}
        xAccessor="x"
        yAccessors={['y']}
        data={data}
        filterSeriesInTooltip={() => false}
      />
    </Chart>
  );
};
