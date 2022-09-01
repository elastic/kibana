/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { euiPaletteColorBlind, EuiPanel } from '@elastic/eui';
import {
  AreaSeries,
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  StackMode,
} from '@elastic/charts';
import { useChartTheme } from '@kbn/observability-plugin/public';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ChartContainer } from '../../shared/charts/chart_container';
import { getTimeZone } from '../../shared/charts/helper/timezone';
import { isTimeseriesEmpty } from '../../shared/charts/helper/helper';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';

interface Props {
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
}

export function StorageChart({ indexLifecyclePhase }: Props) {
  const { core } = useApmPluginContext();
  const chartTheme = useChartTheme();

  const euiPaletteColorBlindRotations = 3;
  const groupedPalette = euiPaletteColorBlind({
    rotations: euiPaletteColorBlindRotations,
  });

  const {
    query: { rangeFrom, rangeTo, environment, kuery },
  } = useApmParams('/storage-explorer');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useProgressiveFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/storage_chart', {
        params: {
          query: {
            indexLifecyclePhase,
            environment,
            kuery,
            start,
            end,
          },
        },
      });
    },
    [indexLifecyclePhase, environment, kuery, start, end]
  );

  const storageTimeSeries: Array<TimeSeries<Coordinate>> =
    data?.storageTimeSeries?.map(({ timeseries, serviceName }, index) => {
      return {
        data: timeseries ?? [],
        type: 'area',
        color:
          groupedPalette[
            Math.floor(index % (10 * euiPaletteColorBlindRotations))
          ],
        title: serviceName,
      };
    }) ?? [];

  const xValues = storageTimeSeries.flatMap(({ data: timeseriesData }) =>
    timeseriesData.map(({ x }) => x)
  );

  const min = Math.min(...xValues);
  const max = Math.max(...xValues);
  const xFormatter = niceTimeFormatter([min, max]);

  const timeZone = getTimeZone(core.uiSettings);
  const isEmpty = isTimeseriesEmpty(storageTimeSeries);

  return (
    <EuiPanel hasShadow={false} hasBorder={true}>
      <ChartContainer
        hasData={!isEmpty}
        height={400}
        status={status}
        id="storageExplorerTimeseriesChart"
      >
        <Chart id="storageExplorerTimeseriesChart">
          <Settings
            theme={[
              {
                areaSeriesStyle: {
                  line: { visible: false },
                },
              },
              ...chartTheme,
            ]}
            showLegend
            legendPosition={Position.Right}
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
            position={Position.Left}
            showGridLines
            tickFormat={(d) => `${Number(d * 100).toFixed(2)} %`}
          />
          {storageTimeSeries.map((serie) => (
            <AreaSeries
              timeZone={timeZone}
              key={serie.title}
              id={serie.title}
              xScaleType={ScaleType.Time}
              yScaleType={ScaleType.Linear}
              xAccessor="x"
              yAccessors={['y']}
              data={isEmpty ? [] : serie.data}
              color={serie.color}
              stackMode={StackMode.Percentage}
              stackAccessors={['x']}
            />
          ))}
        </Chart>
      </ChartContainer>
    </EuiPanel>
  );
}
