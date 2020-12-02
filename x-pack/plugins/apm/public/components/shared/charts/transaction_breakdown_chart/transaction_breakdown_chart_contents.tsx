/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AnnotationDomainTypes,
  AreaSeries,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  niceTimeFormatter,
  Placement,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useChartTheme } from '../../../../../../observability/public';
import {
  asAbsoluteDateTime,
  asPercent,
} from '../../../../../common/utils/formatters';
import { TimeSeries } from '../../../../../typings/timeseries';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useTheme } from '../../../../hooks/use_theme';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useAnnotationsContext } from '../../../../context/annotations/use_annotations_context';
import { useChartPointerEventContext } from '../../../../context/chart_pointer_event/use_chart_pointer_event_context';
import { unit } from '../../../../style/variables';
import { ChartContainer } from '../../charts/chart_container';
import { onBrushEnd } from '../../charts/helper/helper';

interface Props {
  fetchStatus: FETCH_STATUS;
  height?: number;
  showAnnotations: boolean;
  timeseries?: TimeSeries[];
}

export function TransactionBreakdownChartContents({
  fetchStatus,
  height = unit * 16,
  showAnnotations,
  timeseries,
}: Props) {
  const history = useHistory();
  const chartRef = React.createRef<Chart>();
  const { annotations } = useAnnotationsContext();
  const chartTheme = useChartTheme();
  const { pointerEvent, setPointerEvent } = useChartPointerEventContext();
  const { urlParams } = useUrlParams();
  const theme = useTheme();
  const { start, end } = urlParams;

  useEffect(() => {
    if (
      pointerEvent &&
      pointerEvent.chartId !== 'timeSpentBySpan' &&
      chartRef.current
    ) {
      chartRef.current.dispatchExternalPointerEvent(pointerEvent);
    }
  }, [chartRef, pointerEvent]);

  const min = moment.utc(start).valueOf();
  const max = moment.utc(end).valueOf();

  const xFormatter = niceTimeFormatter([min, max]);

  const annotationColor = theme.eui.euiColorSecondary;

  return (
    <ChartContainer height={height} hasData={!!timeseries} status={fetchStatus}>
      <Chart ref={chartRef} id="timeSpentBySpan">
        <Settings
          onBrushEnd={({ x }) => onBrushEnd({ x, history })}
          showLegend
          showLegendExtra
          legendPosition={Position.Bottom}
          theme={chartTheme}
          xDomain={{ min, max }}
          flatLegend
          onPointerUpdate={setPointerEvent}
          externalPointerEvents={{
            tooltip: { visible: true, placement: Placement.Bottom },
          }}
        />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
          gridLine={{ visible: false }}
        />
        <Axis
          id="y-axis"
          ticks={3}
          position={Position.Left}
          tickFormat={(y: number) => asPercent(y ?? 0, 1)}
        />

        {showAnnotations && (
          <LineAnnotation
            id="annotations"
            domainType={AnnotationDomainTypes.XDomain}
            dataValues={annotations.map((annotation) => ({
              dataValue: annotation['@timestamp'],
              header: asAbsoluteDateTime(annotation['@timestamp']),
              details: `${i18n.translate('xpack.apm.chart.annotation.version', {
                defaultMessage: 'Version',
              })} ${annotation.text}`,
            }))}
            style={{
              line: { strokeWidth: 1, stroke: annotationColor, opacity: 1 },
            }}
            marker={<EuiIcon type="dot" color={annotationColor} />}
            markerPosition={Position.Top}
          />
        )}

        {timeseries?.length ? (
          timeseries.map((serie) => {
            return (
              <AreaSeries
                key={serie.title}
                id={serie.title}
                name={serie.title}
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={serie.data}
                stackAccessors={['x']}
                stackMode={'percentage'}
                color={serie.areaColor}
                curve={CurveType.CURVE_MONOTONE_X}
              />
            );
          })
        ) : (
          // When timeseries is empty, loads an AreaSeries chart to show the default empty message.
          <AreaSeries id="empty_chart" data={[]} />
        )}
      </Chart>
    </ChartContainer>
  );
}
