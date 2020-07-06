/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import {
  Chart,
  Settings,
  Axis,
  LineSeries,
  AreaSeries,
  BarSeries,
  Position,
  GeometryValue,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  ExpressionValueSearchContext,
} from 'src/plugins/expressions/public';
import { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  LensMultiTable,
  FormatFactory,
  ILensInterpreterRenderHandlers,
  LensFilterEvent,
  LensBrushEvent,
} from '../types';
import { XYArgs, SeriesType, visualizationTypes } from './types';
import { VisualizationContainer } from '../visualization_container';
import { isHorizontalChart, getSeriesColor } from './state_helpers';
import { parseInterval } from '../../../../../src/plugins/data/common';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';
import { EmptyPlaceholder } from '../shared_components';
import { desanitizeFilterContext } from '../utils';
import { fittingFunctionDefinitions, getFitOptions } from './fitting_functions';
import { getAxesConfiguration } from './axes_configuration';

type InferPropType<T> = T extends React.FunctionComponent<infer P> ? P : T;
type SeriesSpec = InferPropType<typeof LineSeries> &
  InferPropType<typeof BarSeries> &
  InferPropType<typeof AreaSeries>;

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

type XYChartRenderProps = XYChartProps & {
  chartsThemeService: ChartsPluginSetup['theme'];
  formatFactory: FormatFactory;
  timeZone: string;
  histogramBarTarget: number;
  onClickValue: (data: LensFilterEvent['data']) => void;
  onSelectRange: (data: LensBrushEvent['data']) => void;
};

export const xyChart: ExpressionFunctionDefinition<
  'lens_xy_chart',
  LensMultiTable | ExpressionValueSearchContext | null,
  XYArgs,
  XYRender
> = {
  name: 'lens_xy_chart',
  type: 'render',
  inputTypes: ['lens_multitable', 'kibana_context', 'null'],
  help: i18n.translate('xpack.lens.xyChart.help', {
    defaultMessage: 'An X/Y chart',
  }),
  args: {
    xTitle: {
      types: ['string'],
      help: 'X axis title',
    },
    yTitle: {
      types: ['string'],
      help: 'Y axis title',
    },
    legend: {
      types: ['lens_xy_legendConfig'],
      help: i18n.translate('xpack.lens.xyChart.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    fittingFunction: {
      types: ['string'],
      options: [...fittingFunctionDefinitions.map(({ id }) => id)],
      help: i18n.translate('xpack.lens.xyChart.fittingFunction.help', {
        defaultMessage: 'Define how missing values are treated',
      }),
    },
    layers: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      types: ['lens_xy_layer'] as any,
      help: 'Layers of visual series',
      multi: true,
    },
  },
  fn(data: LensMultiTable, args: XYArgs) {
    return {
      type: 'render',
      as: 'lens_xy_chart_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

export const getXyChartRenderer = (dependencies: {
  formatFactory: Promise<FormatFactory>;
  chartsThemeService: ChartsPluginSetup['theme'];
  histogramBarTarget: number;
  timeZone: string;
}): ExpressionRenderDefinition<XYChartProps> => ({
  name: 'lens_xy_chart_renderer',
  displayName: 'XY chart',
  help: i18n.translate('xpack.lens.xyChart.renderer.help', {
    defaultMessage: 'X/Y chart renderer',
  }),
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: XYChartProps,
    handlers: ILensInterpreterRenderHandlers
  ) => {
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    const onClickValue = (data: LensFilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: LensBrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };
    const formatFactory = await dependencies.formatFactory;
    ReactDOM.render(
      <I18nProvider>
        <XYChartReportable
          {...config}
          formatFactory={formatFactory}
          chartsThemeService={dependencies.chartsThemeService}
          timeZone={dependencies.timeZone}
          histogramBarTarget={dependencies.histogramBarTarget}
          onClickValue={onClickValue}
          onSelectRange={onSelectRange}
        />
      </I18nProvider>,
      domNode,
      () => handlers.done()
    );
  },
});

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationTypes.find((c) => c.id === seriesType)!.icon || 'empty';
}

const MemoizedChart = React.memo(XYChart);

export function XYChartReportable(props: XYChartRenderProps) {
  const [state, setState] = useState({
    isReady: false,
  });

  // It takes a cycle for the XY chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

  return (
    <VisualizationContainer className="lnsXyExpression__container" isReady={state.isReady}>
      <MemoizedChart {...props} />
    </VisualizationContainer>
  );
}

export function XYChart({
  data,
  args,
  formatFactory,
  timeZone,
  chartsThemeService,
  histogramBarTarget,
  onClickValue,
  onSelectRange,
}: XYChartRenderProps) {
  const { legend, layers, fittingFunction } = args;
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();

  const filteredLayers = layers.filter(({ layerId, xAccessor, accessors }) => {
    return !(
      !xAccessor ||
      !accessors.length ||
      !data.tables[layerId] ||
      data.tables[layerId].rows.length === 0 ||
      data.tables[layerId].rows.every((row) => typeof row[xAccessor] === 'undefined')
    );
  });

  if (filteredLayers.length === 0) {
    const icon: IconType = layers.length > 0 ? getIconForSeriesType(layers[0].seriesType) : 'bar';
    return <EmptyPlaceholder icon={icon} />;
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = data.tables[filteredLayers[0].layerId].columns.find(
    ({ id }) => id === filteredLayers[0].xAccessor
  );
  const xAxisFormatter = formatFactory(xAxisColumn && xAxisColumn.formatHint);

  const chartHasMoreThanOneSeries =
    filteredLayers.length > 1 ||
    filteredLayers.some((layer) => layer.accessors.length > 1) ||
    filteredLayers.some((layer) => layer.splitAccessor);
  const shouldRotate = isHorizontalChart(filteredLayers);

  const yAxesConfiguration = getAxesConfiguration(
    filteredLayers,
    data.tables,
    formatFactory,
    shouldRotate
  );

  const xTitle = (xAxisColumn && xAxisColumn.name) || args.xTitle;

  function calculateMinInterval() {
    // check all the tables to see if all of the rows have the same timestamp
    // that would mean that chart will draw a single bar
    const isSingleTimestampInXDomain = () => {
      const firstRowValue =
        data.tables[filteredLayers[0].layerId].rows[0][filteredLayers[0].xAccessor!];
      for (const layer of filteredLayers) {
        if (
          layer.xAccessor &&
          data.tables[layer.layerId].rows.some((row) => row[layer.xAccessor!] !== firstRowValue)
        ) {
          return false;
        }
      }
      return true;
    };

    // add minInterval only for single point in domain
    if (data.dateRange && isSingleTimestampInXDomain()) {
      if (xAxisColumn?.meta?.aggConfigParams?.interval !== 'auto')
        return parseInterval(xAxisColumn?.meta?.aggConfigParams?.interval)?.asMilliseconds();

      const { fromDate, toDate } = data.dateRange;
      const duration = moment(toDate).diff(moment(fromDate));
      const targetMs = duration / histogramBarTarget;
      return isNaN(targetMs) ? 0 : Math.max(Math.floor(targetMs), 1);
    }
    return undefined;
  }

  const isTimeViz = data.dateRange && filteredLayers.every((l) => l.xScaleType === 'time');

  const xDomain = isTimeViz
    ? {
        min: data.dateRange?.fromDate.getTime(),
        max: data.dateRange?.toDate.getTime(),
        minInterval: calculateMinInterval(),
      }
    : undefined;

  return (
    <Chart>
      <Settings
        showLegend={legend.isVisible ? chartHasMoreThanOneSeries : legend.isVisible}
        legendPosition={legend.position}
        showLegendExtra={false}
        theme={chartTheme}
        baseTheme={chartBaseTheme}
        tooltip={{
          headerFormatter: (d) => xAxisFormatter.convert(d.value),
        }}
        rotation={shouldRotate ? 90 : 0}
        xDomain={xDomain}
        onBrushEnd={({ x }) => {
          if (!x) {
            return;
          }
          const [min, max] = x;
          // in the future we want to make it also for histogram
          if (!xAxisColumn || !isTimeViz) {
            return;
          }

          const table = data.tables[filteredLayers[0].layerId];

          const xAxisColumnIndex = table.columns.findIndex(
            (el) => el.id === filteredLayers[0].xAccessor
          );
          const timeFieldName = table.columns[xAxisColumnIndex]?.meta?.aggConfigParams?.field;

          const context: LensBrushEvent['data'] = {
            range: [min, max],
            table,
            column: xAxisColumnIndex,
            timeFieldName,
          };
          onSelectRange(context);
        }}
        onElementClick={([[geometry, series]]) => {
          // for xyChart series is always XYChartSeriesIdentifier and geometry is always type of GeometryValue
          const xySeries = series as XYChartSeriesIdentifier;
          const xyGeometry = geometry as GeometryValue;

          const layer = filteredLayers.find((l) =>
            xySeries.seriesKeys.some((key: string | number) => l.accessors.includes(key.toString()))
          );
          if (!layer) {
            return;
          }

          const table = data.tables[layer.layerId];

          const points = [
            {
              row: table.rows.findIndex(
                (row) => layer.xAccessor && row[layer.xAccessor] === xyGeometry.x
              ),
              column: table.columns.findIndex((col) => col.id === layer.xAccessor),
              value: xyGeometry.x,
            },
          ];

          if (xySeries.seriesKeys.length > 1) {
            const pointValue = xySeries.seriesKeys[0];

            points.push({
              row: table.rows.findIndex(
                (row) => layer.splitAccessor && row[layer.splitAccessor] === pointValue
              ),
              column: table.columns.findIndex((col) => col.id === layer.splitAccessor),
              value: pointValue,
            });
          }

          const xAxisFieldName = table.columns.find((el) => el.id === layer.xAccessor)?.meta
            ?.aggConfigParams?.field;
          const timeFieldName = xDomain && xAxisFieldName;

          const context: LensFilterEvent['data'] = {
            data: points.map((point) => ({
              row: point.row,
              column: point.column,
              value: point.value,
              table,
            })),
            timeFieldName,
          };
          onClickValue(desanitizeFilterContext(context));
        }}
      />

      <Axis
        id="x"
        position={shouldRotate ? Position.Left : Position.Bottom}
        title={xTitle}
        showGridLines={false}
        hide={filteredLayers[0].hide}
        tickFormat={(d) => xAxisFormatter.convert(d)}
      />

      {yAxesConfiguration.map((axis, index) => (
        <Axis
          key={axis.groupId}
          id={axis.groupId}
          groupId={axis.groupId}
          position={axis.position}
          title={
            axis.series
              .map(
                (series) =>
                  data.tables[series.layer].columns.find((column) => column.id === series.accessor)
                    ?.name
              )
              .filter((name) => Boolean(name))[0] || args.yTitle
          }
          showGridLines={false}
          hide={filteredLayers[0].hide}
          tickFormat={(d) => axis.formatter.convert(d)}
        />
      ))}

      {filteredLayers.flatMap((layer, layerIndex) =>
        layer.accessors.map((accessor, accessorIndex) => {
          const {
            splitAccessor,
            seriesType,
            accessors,
            xAccessor,
            layerId,
            columnToLabel,
            yScaleType,
            xScaleType,
            isHistogram,
          } = layer;
          const columnToLabelMap: Record<string, string> = columnToLabel
            ? JSON.parse(columnToLabel)
            : {};

          const table = data.tables[layerId];

          // For date histogram chart type, we're getting the rows that represent intervals without data.
          // To not display them in the legend, they need to be filtered out.
          const rows = table.rows.filter(
            (row) =>
              xAccessor &&
              typeof row[xAccessor] !== 'undefined' &&
              !(
                splitAccessor &&
                typeof row[splitAccessor] === 'undefined' &&
                typeof row[accessor] === 'undefined'
              )
          );

          const seriesProps: SeriesSpec = {
            splitSeriesAccessors: splitAccessor ? [splitAccessor] : [],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor as string] : [],
            id: `${splitAccessor}-${accessor}`,
            xAccessor,
            yAccessors: [accessor],
            data: rows,
            xScaleType,
            yScaleType,
            color: () => getSeriesColor(layer, accessor),
            groupId: yAxesConfiguration.find((axisConfiguration) =>
              axisConfiguration.series.find((currentSeries) => currentSeries.accessor === accessor)
            )?.groupId,
            enableHistogramMode: isHistogram && (seriesType.includes('stacked') || !splitAccessor),
            timeZone,
            name(d) {
              const splitHint = table.columns.find((col) => col.id === splitAccessor)?.formatHint;

              // For multiple y series, the name of the operation is used on each, either:
              // * Key - Y name
              // * Formatted value - Y name
              if (accessors.length > 1) {
                return d.seriesKeys
                  .map((key: string | number, i) => {
                    if (i === 0 && splitHint) {
                      return formatFactory(splitHint).convert(key);
                    }
                    return splitAccessor && i === 0 ? key : columnToLabelMap[key] ?? '';
                  })
                  .join(' - ');
              }

              // For formatted split series, format the key
              // This handles splitting by dates, for example
              if (splitHint) {
                return formatFactory(splitHint).convert(d.seriesKeys[0]);
              }
              // This handles both split and single-y cases:
              // * If split series without formatting, show the value literally
              // * If single Y, the seriesKey will be the accessor, so we show the human-readable name
              return splitAccessor ? d.seriesKeys[0] : columnToLabelMap[d.seriesKeys[0]] ?? '';
            },
          };

          const index = `${layerIndex}-${accessorIndex}`;

          switch (seriesType) {
            case 'line':
              return (
                <LineSeries key={index} {...seriesProps} fit={getFitOptions(fittingFunction)} />
              );
            case 'bar':
            case 'bar_stacked':
            case 'bar_horizontal':
            case 'bar_horizontal_stacked':
              return <BarSeries key={index} {...seriesProps} />;
            case 'area_stacked':
              return <AreaSeries key={index} {...seriesProps} />;
            case 'area':
              return (
                <AreaSeries key={index} {...seriesProps} fit={getFitOptions(fittingFunction)} />
              );
            default:
              return assertNever(seriesType);
          }
        })
      )}
    </Chart>
  );
}

function assertNever(x: never): never {
  throw new Error('Unexpected series type: ' + x);
}
