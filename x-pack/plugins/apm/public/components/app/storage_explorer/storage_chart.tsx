/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { euiPaletteColorBlind } from '@elastic/eui';
import {
  AreaSeries,
  Axis,
  Chart,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { useChartThemes } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { useProgressiveFetcher } from '../../../hooks/use_progressive_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useApmParams } from '../../../hooks/use_apm_params';
import { ChartContainer } from '../../shared/charts/chart_container';
import { getTimeZone } from '../../shared/charts/helper/timezone';
import { isTimeseriesEmpty } from '../../shared/charts/helper/helper';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { Coordinate, TimeSeries } from '../../../../typings/timeseries';
import { asDynamicBytes } from '../../../../common/utils/formatters';

export function StorageChart() {
  const { core } = useApmPluginContext();
  const chartThemes = useChartThemes();

  const euiPaletteColorBlindRotations = 3;
  const groupedPalette = euiPaletteColorBlind({
    rotations: euiPaletteColorBlindRotations,
  });

  const {
    query: { rangeFrom, rangeTo, environment, kuery, indexLifecyclePhase },
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
                area: { opacity: 1 },
              },
            },
            ...chartThemes.theme,
          ]}
          baseTheme={chartThemes.baseTheme}
          showLegend
          legendPosition={Position.Right}
          locale={i18n.getLocale()}
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
          gridLine={{ visible: true }}
          tickFormat={asDynamicBytes}
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
            stackAccessors={['x']}
          />
        ))}
      </Chart>
    </ChartContainer>
  );
}
