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
import { FETCH_STATUS } from '../../../../hooks/useFetcher';
import { useTheme } from '../../../../hooks/useTheme';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { useChartsSync } from '../../../../hooks/use_charts_sync';
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
  const { event, setEvent, annotations } = useChartsSync();
  const chartTheme = useChartTheme();
  const { urlParams } = useUrlParams();
  const theme = useTheme();
  const { start, end } = urlParams;

  useEffect(() => {
    if (event.chartId !== 'timeSpentBySpan' && chartRef.current) {
      chartRef.current.dispatchExternalPointerEvent(event);
    }
  }, [chartRef, event]);

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
          onPointerUpdate={(currEvent: any) => {
            setEvent(currEvent);
          }}
          externalPointerEvents={{
            tooltip: { visible: true, placement: Placement.Bottom },
          }}
        />
        <Axis
          id="x-axis"
          position={Position.Bottom}
          showOverlappingTicks
          tickFormat={xFormatter}
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
