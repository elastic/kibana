/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef } from 'react';
import moment from 'moment';

import { Chart, Axis, AreaSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { useActiveCursor } from '@kbn/charts-plugin/public';
import { EuiSkeletonText } from '@elastic/eui';
import { getBrushData } from '@kbn/observability-utils/chart/utils';
import { AnnotationEvent } from './annotation_event';
import { TIME_LINE_THEME } from './timeline_theme';
import { useFetchEvents } from '../../../../hooks/use_fetch_events';
import { useInvestigation } from '../../contexts/investigation_context';
import { useKibana } from '../../../../hooks/use_kibana';
import { AlertEvent } from './alert_event';

export const InvestigateTimeLine = () => {
  const { dependencies } = useKibana();

  const baseTheme = dependencies.start.charts.theme.useChartsBaseTheme();

  const { globalParams, updateInvestigationParams } = useInvestigation();

  const { data: events, isLoading } = useFetchEvents({
    rangeFrom: globalParams.timeRange.from,
    rangeTo: globalParams.timeRange.to,
  });

  const chartRef = useRef(null);
  const handleCursorUpdate = useActiveCursor(dependencies.start.charts.activeCursor, chartRef, {
    isDateHistogram: true,
  });

  if (isLoading) {
    return <EuiSkeletonText />;
  }

  const alertEvents = events?.filter((evt) => evt.eventType === 'alert');
  const annotations = events?.filter((evt) => evt.eventType === 'annotation');

  return (
    <>
      <Chart size={['100%', 100]} ref={chartRef}>
        <Settings
          xDomain={{
            min: moment(globalParams.timeRange.from).valueOf(),
            max: moment(globalParams.timeRange.to).valueOf(),
          }}
          theme={TIME_LINE_THEME}
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

        {alertEvents?.map((event) => (
          <AlertEvent key={event.id} event={event} />
        ))}

        {annotations?.map((annotation) => (
          <AnnotationEvent key={annotation.id} event={annotation} />
        ))}

        <AreaSeries
          id="Time"
          xScaleType={ScaleType.Time}
          xAccessor="x"
          yAccessors={['y']}
          data={[
            { x: moment(globalParams.timeRange.from).valueOf(), y: 0 },
            { x: moment(globalParams.timeRange.to).valueOf(), y: 0 },
          ]}
        />
      </Chart>
    </>
  );
};
