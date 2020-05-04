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
  PartialTheme,
  GeometryValue,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import {
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
  ExpressionFunctionDefinition,
  ExpressionValueSearchContext,
} from 'src/plugins/expressions/public';
import { EuiIcon, EuiText, IconType, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  ValueClickTriggerContext,
  RangeSelectTriggerContext,
} from '../../../../../src/plugins/embeddable/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';
import { LensMultiTable, FormatFactory } from '../types';
import { XYArgs, SeriesType, visualizationTypes } from './types';
import { VisualizationContainer } from '../visualization_container';
import { isHorizontalChart } from './state_helpers';
import { getExecuteTriggerActions } from '../services';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { parseInterval } from '../../../../../src/plugins/data/common';

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
  chartTheme: PartialTheme;
  formatFactory: FormatFactory;
  timeZone: string;
  histogramBarTarget: number;
  executeTriggerActions: UiActionsStart['executeTriggerActions'];
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
  chartTheme: PartialTheme;
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
  render: async (domNode: Element, config: XYChartProps, handlers: IInterpreterRenderHandlers) => {
    const executeTriggerActions = getExecuteTriggerActions();
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    const formatFactory = await dependencies.formatFactory;
    ReactDOM.render(
      <I18nProvider>
        <XYChartReportable
          {...config}
          formatFactory={formatFactory}
          chartTheme={dependencies.chartTheme}
          timeZone={dependencies.timeZone}
          histogramBarTarget={dependencies.histogramBarTarget}
          executeTriggerActions={executeTriggerActions}
        />
      </I18nProvider>,
      domNode,
      () => handlers.done()
    );
  },
});

function getIconForSeriesType(seriesType: SeriesType): IconType {
  return visualizationTypes.find(c => c.id === seriesType)!.icon || 'empty';
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
  chartTheme,
  histogramBarTarget,
  executeTriggerActions,
}: XYChartRenderProps) {
  const { legend, layers } = args;

  if (Object.values(data.tables).every(table => table.rows.length === 0)) {
    const icon: IconType = layers.length > 0 ? getIconForSeriesType(layers[0].seriesType) : 'bar';
    return (
      <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
        <EuiIcon type={icon} color="subdued" size="l" />
        <EuiSpacer size="s" />
        <p>
          <FormattedMessage
            id="xpack.lens.xyVisualization.noDataLabel"
            defaultMessage="No results found"
          />
        </p>
      </EuiText>
    );
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = Object.values(data.tables)[0].columns.find(
    ({ id }) => id === layers[0].xAccessor
  );
  const xAxisFormatter = formatFactory(xAxisColumn && xAxisColumn.formatHint);

  // use default number formatter for y axis and use formatting hint if there is just a single y column
  let yAxisFormatter = formatFactory({ id: 'number' });
  if (layers.length === 1 && layers[0].accessors.length === 1) {
    const firstYAxisColumn = Object.values(data.tables)[0].columns.find(
      ({ id }) => id === layers[0].accessors[0]
    );
    if (firstYAxisColumn && firstYAxisColumn.formatHint) {
      yAxisFormatter = formatFactory(firstYAxisColumn.formatHint);
    }
  }

  const chartHasMoreThanOneSeries =
    layers.length > 1 || data.tables[layers[0].layerId].columns.length > 2;
  const shouldRotate = isHorizontalChart(layers);

  const xTitle = (xAxisColumn && xAxisColumn.name) || args.xTitle;

  function calculateMinInterval() {
    // check all the tables to see if all of the rows have the same timestamp
    // that would mean that chart will draw a single bar
    const isSingleTimestampInXDomain = () => {
      const nonEmptyLayers = layers.filter(
        layer => data.tables[layer.layerId].rows.length && layer.xAccessor
      );

      if (!nonEmptyLayers.length) {
        return;
      }

      const firstRowValue =
        data.tables[nonEmptyLayers[0].layerId].rows[0][nonEmptyLayers[0].xAccessor!];
      for (const layer of nonEmptyLayers) {
        if (
          layer.xAccessor &&
          data.tables[layer.layerId].rows.some(row => row[layer.xAccessor!] !== firstRowValue)
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

  const isTimeViz = data.dateRange && layers.every(l => l.xScaleType === 'time');

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
        rotation={shouldRotate ? 90 : 0}
        xDomain={xDomain}
        onBrushEnd={(min: number, max: number) => {
          // in the future we want to make it also for histogram
          if (!xAxisColumn || !isTimeViz) {
            return;
          }

          const firstLayerWithData =
            layers[layers.findIndex(layer => data.tables[layer.layerId].rows.length)];
          const table = data.tables[firstLayerWithData.layerId];

          const xAxisColumnIndex = table.columns.findIndex(
            el => el.id === firstLayerWithData.xAccessor
          );
          const timeFieldName = table.columns[xAxisColumnIndex]?.meta?.aggConfigParams?.field;

          const context: RangeSelectTriggerContext = {
            data: {
              range: [min, max],
              table,
              column: xAxisColumnIndex,
            },
            timeFieldName,
          };
          executeTriggerActions(VIS_EVENT_TO_TRIGGER.brush, context);
        }}
        onElementClick={([[geometry, series]]) => {
          // for xyChart series is always XYChartSeriesIdentifier and geometry is always type of GeometryValue
          const xySeries = series as XYChartSeriesIdentifier;
          const xyGeometry = geometry as GeometryValue;

          const layer = layers.find(l =>
            xySeries.seriesKeys.some((key: string | number) => l.accessors.includes(key.toString()))
          );
          if (!layer) {
            return;
          }

          const table = data.tables[layer.layerId];

          const points = [
            {
              row: table.rows.findIndex(
                row => layer.xAccessor && row[layer.xAccessor] === xyGeometry.x
              ),
              column: table.columns.findIndex(col => col.id === layer.xAccessor),
              value: xyGeometry.x,
            },
          ];

          if (xySeries.seriesKeys.length > 1) {
            const pointValue = xySeries.seriesKeys[0];

            points.push({
              row: table.rows.findIndex(
                row => layer.splitAccessor && row[layer.splitAccessor] === pointValue
              ),
              column: table.columns.findIndex(col => col.id === layer.splitAccessor),
              value: pointValue,
            });
          }

          const xAxisFieldName = table.columns.find(el => el.id === layer.xAccessor)?.meta
            ?.aggConfigParams?.field;
          const timeFieldName = xDomain && xAxisFieldName;

          const context: ValueClickTriggerContext = {
            data: {
              data: points.map(point => ({
                row: point.row,
                column: point.column,
                value: point.value,
                table,
              })),
            },
            timeFieldName,
          };
          executeTriggerActions(VIS_EVENT_TO_TRIGGER.filter, context);
        }}
      />

      <Axis
        id="x"
        position={shouldRotate ? Position.Left : Position.Bottom}
        title={xTitle}
        showGridLines={false}
        hide={layers[0].hide}
        tickFormat={d => xAxisFormatter.convert(d)}
      />

      <Axis
        id="y"
        position={shouldRotate ? Position.Bottom : Position.Left}
        title={args.yTitle}
        showGridLines={false}
        hide={layers[0].hide}
        tickFormat={d => yAxisFormatter.convert(d)}
      />

      {layers.map(
        (
          {
            splitAccessor,
            seriesType,
            accessors,
            xAccessor,
            layerId,
            columnToLabel,
            yScaleType,
            xScaleType,
            isHistogram,
          },
          index
        ) => {
          if (
            !xAccessor ||
            !accessors.length ||
            !data.tables[layerId] ||
            data.tables[layerId].rows.length === 0 ||
            data.tables[layerId].rows.every(row => typeof row[xAccessor] === 'undefined')
          ) {
            return;
          }

          const columnToLabelMap: Record<string, string> = columnToLabel
            ? JSON.parse(columnToLabel)
            : {};

          const table = data.tables[layerId];

          // For date histogram chart type, we're getting the rows that represent intervals without data.
          // To not display them in the legend, they need to be filtered out.
          const rows = table.rows.filter(
            row =>
              !(splitAccessor && !row[splitAccessor] && accessors.every(accessor => !row[accessor]))
          );

          const seriesProps: SeriesSpec = {
            splitSeriesAccessors: splitAccessor ? [splitAccessor] : [],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor] : [],
            id: splitAccessor || accessors.join(','),
            xAccessor,
            yAccessors: accessors,
            data: rows,
            xScaleType,
            yScaleType,
            enableHistogramMode: isHistogram && (seriesType.includes('stacked') || !splitAccessor),
            timeZone,
            name(d) {
              const splitHint = table.columns.find(col => col.id === splitAccessor)?.formatHint;

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
              // * If single Y, the seriesKey will be the acccessor, so we show the human-readable name
              return splitAccessor ? d.seriesKeys[0] : columnToLabelMap[d.seriesKeys[0]] ?? '';
            },
          };

          switch (seriesType) {
            case 'line':
              return <LineSeries key={index} {...seriesProps} />;
            case 'bar':
            case 'bar_stacked':
            case 'bar_horizontal':
            case 'bar_horizontal_stacked':
              return <BarSeries key={index} {...seriesProps} />;
            default:
              return <AreaSeries key={index} {...seriesProps} />;
          }
        }
      )}
    </Chart>
  );
}
