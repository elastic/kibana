/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
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
  StackMode,
  VerticalAlignment,
  HorizontalAlignment,
  ElementClickListener,
  BrushEndListener,
} from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import {
  ExpressionFunctionDefinition,
  ExpressionRenderDefinition,
  Datatable,
  DatatableRow,
} from 'src/plugins/expressions/public';
import { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RenderMode } from 'src/plugins/expressions';
import {
  LensMultiTable,
  FormatFactory,
  ILensInterpreterRenderHandlers,
  LensFilterEvent,
  LensBrushEvent,
} from '../types';
import { XYArgs, SeriesType, visualizationTypes, LayerArgs } from './types';
import { VisualizationContainer } from '../visualization_container';
import { isHorizontalChart, getSeriesColor } from './state_helpers';
import {
  DataPublicPluginStart,
  ExpressionValueSearchContext,
  search,
} from '../../../../../src/plugins/data/public';
import {
  ChartsPluginSetup,
  PaletteRegistry,
  SeriesLayer,
} from '../../../../../src/plugins/charts/public';
import { EmptyPlaceholder } from '../shared_components';
import { desanitizeFilterContext } from '../utils';
import { fittingFunctionDefinitions, getFitOptions } from './fitting_functions';
import { getAxesConfiguration } from './axes_configuration';
import { getColorAssignments } from './color_assignment';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

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

export type XYChartRenderProps = XYChartProps & {
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
  formatFactory: FormatFactory;
  timeZone: string;
  minInterval: number | undefined;
  onClickValue: (data: LensFilterEvent['data']) => void;
  onSelectRange: (data: LensBrushEvent['data']) => void;
  renderMode: RenderMode;
  syncColors: boolean;
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
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
    xTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.xTitle.help', {
        defaultMessage: 'X axis title',
      }),
    },
    yTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.yLeftTitle.help', {
        defaultMessage: 'Y left axis title',
      }),
    },
    yRightTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.yRightTitle.help', {
        defaultMessage: 'Y right axis title',
      }),
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
    valueLabels: {
      types: ['string'],
      options: ['hide', 'inside'],
      help: '',
    },
    tickLabelsVisibilitySettings: {
      types: ['lens_xy_tickLabelsConfig'],
      help: i18n.translate('xpack.lens.xyChart.tickLabelsSettings.help', {
        defaultMessage: 'Show x and y axes tick labels',
      }),
    },
    gridlinesVisibilitySettings: {
      types: ['lens_xy_gridlinesConfig'],
      help: i18n.translate('xpack.lens.xyChart.gridlinesSettings.help', {
        defaultMessage: 'Show x and y axes gridlines',
      }),
    },
    axisTitlesVisibilitySettings: {
      types: ['lens_xy_axisTitlesVisibilityConfig'],
      help: i18n.translate('xpack.lens.xyChart.axisTitlesSettings.help', {
        defaultMessage: 'Show x and y axes titles',
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

export async function calculateMinInterval(
  { args: { layers }, data }: XYChartProps,
  getIntervalByColumn: DataPublicPluginStart['search']['aggs']['getDateMetaByDatatableColumn']
) {
  const filteredLayers = getFilteredLayers(layers, data);
  if (filteredLayers.length === 0) return;
  const isTimeViz = data.dateRange && filteredLayers.every((l) => l.xScaleType === 'time');
  const xColumn = data.tables[filteredLayers[0].layerId].columns.find(
    (column) => column.id === filteredLayers[0].xAccessor
  );

  if (!xColumn) return;
  if (!isTimeViz) {
    const histogramInterval = search.aggs.getNumberHistogramIntervalByDatatableColumn(xColumn);
    if (typeof histogramInterval === 'number') {
      return histogramInterval;
    } else {
      return undefined;
    }
  }
  const dateMetaData = await getIntervalByColumn(xColumn);
  if (!dateMetaData) return;
  const intervalDuration = search.aggs.parseInterval(dateMetaData.interval);
  if (!intervalDuration) return;
  return intervalDuration.as('milliseconds');
}

export const getXyChartRenderer = (dependencies: {
  formatFactory: Promise<FormatFactory>;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
  getIntervalByColumn: DataPublicPluginStart['search']['aggs']['getDateMetaByDatatableColumn'];
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
          paletteService={dependencies.paletteService}
          timeZone={dependencies.timeZone}
          minInterval={await calculateMinInterval(config, dependencies.getIntervalByColumn)}
          onClickValue={onClickValue}
          onSelectRange={onSelectRange}
          renderMode={handlers.getRenderMode()}
          syncColors={handlers.isSyncColorsEnabled()}
        />
      </I18nProvider>,
      domNode,
      () => handlers.done()
    );
  },
});

function getValueLabelsStyling(isHorizontal: boolean) {
  const VALUE_LABELS_MAX_FONTSIZE = 15;
  const VALUE_LABELS_MIN_FONTSIZE = 10;
  const VALUE_LABELS_VERTICAL_OFFSET = -10;
  const VALUE_LABELS_HORIZONTAL_OFFSET = 10;

  return {
    displayValue: {
      fontSize: { min: VALUE_LABELS_MIN_FONTSIZE, max: VALUE_LABELS_MAX_FONTSIZE },
      fill: { textInverted: true, textBorder: 2 },
      alignment: isHorizontal
        ? {
            vertical: VerticalAlignment.Middle,
          }
        : { horizontal: HorizontalAlignment.Center },
      offsetX: isHorizontal ? VALUE_LABELS_HORIZONTAL_OFFSET : 0,
      offsetY: isHorizontal ? 0 : VALUE_LABELS_VERTICAL_OFFSET,
    },
  };
}

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
  }, [setState]);

  return (
    <VisualizationContainer
      className="lnsXyExpression__container"
      isReady={state.isReady}
      reportTitle={props.args.title}
      reportDescription={props.args.description}
    >
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
  paletteService,
  minInterval,
  onClickValue,
  onSelectRange,
  renderMode,
  syncColors,
}: XYChartRenderProps) {
  const { legend, layers, fittingFunction, gridlinesVisibilitySettings, valueLabels } = args;
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();

  const filteredLayers = getFilteredLayers(layers, data);

  if (filteredLayers.length === 0) {
    const icon: IconType = layers.length > 0 ? getIconForSeriesType(layers[0].seriesType) : 'bar';
    return <EmptyPlaceholder icon={icon} />;
  }

  // use formatting hint of first x axis column to format ticks
  const xAxisColumn = data.tables[filteredLayers[0].layerId].columns.find(
    ({ id }) => id === filteredLayers[0].xAccessor
  );
  const xAxisFormatter = formatFactory(xAxisColumn && xAxisColumn.meta?.params);
  const layersAlreadyFormatted: Record<string, boolean> = {};
  // This is a safe formatter for the xAccessor that abstracts the knowledge of already formatted layers
  const safeXAccessorLabelRenderer = (value: unknown): string =>
    xAxisColumn && layersAlreadyFormatted[xAxisColumn.id]
      ? (value as string)
      : xAxisFormatter.convert(value);

  const chartHasMoreThanOneSeries =
    filteredLayers.length > 1 ||
    filteredLayers.some((layer) => layer.accessors.length > 1) ||
    filteredLayers.some((layer) => layer.splitAccessor);
  const shouldRotate = isHorizontalChart(filteredLayers);

  const yAxesConfiguration = getAxesConfiguration(
    filteredLayers,
    shouldRotate,
    data.tables,
    formatFactory
  );

  const xTitle = args.xTitle || (xAxisColumn && xAxisColumn.name);
  const axisTitlesVisibilitySettings = args.axisTitlesVisibilitySettings || {
    x: true,
    yLeft: true,
    yRight: true,
  };
  const tickLabelsVisibilitySettings = args.tickLabelsVisibilitySettings || {
    x: true,
    yLeft: true,
    yRight: true,
  };

  const filteredBarLayers = filteredLayers.filter((layer) => layer.seriesType.includes('bar'));

  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1) ||
    filteredBarLayers.some((layer) => layer.splitAccessor);

  const isTimeViz = data.dateRange && filteredLayers.every((l) => l.xScaleType === 'time');
  const isHistogramViz = filteredLayers.every((l) => l.isHistogram);

  const xDomain = {
    min: isTimeViz ? data.dateRange?.fromDate.getTime() : undefined,
    max: isTimeViz ? data.dateRange?.toDate.getTime() : undefined,
    minInterval,
  };

  const getYAxesTitles = (
    axisSeries: Array<{ layer: string; accessor: string }>,
    groupId: string
  ) => {
    const yTitle = groupId === 'right' ? args.yRightTitle : args.yTitle;
    return (
      yTitle ||
      axisSeries
        .map(
          (series) =>
            data.tables[series.layer].columns.find((column) => column.id === series.accessor)?.name
        )
        .filter((name) => Boolean(name))[0]
    );
  };

  const getYAxesStyle = (groupId: string) => {
    const style = {
      tickLabel: {
        visible:
          groupId === 'right'
            ? tickLabelsVisibilitySettings?.yRight
            : tickLabelsVisibilitySettings?.yLeft,
      },
      axisTitle: {
        visible:
          groupId === 'right'
            ? axisTitlesVisibilitySettings?.yRight
            : axisTitlesVisibilitySettings?.yLeft,
      },
    };
    return style;
  };

  const shouldShowValueLabels =
    // No stacked bar charts
    filteredLayers.every((layer) => !layer.seriesType.includes('stacked')) &&
    // No histogram charts
    !isHistogramViz;

  const valueLabelsStyling =
    shouldShowValueLabels && valueLabels !== 'hide' && getValueLabelsStyling(shouldRotate);

  const colorAssignments = getColorAssignments(args.layers, data, formatFactory);

  const clickHandler: ElementClickListener = ([[geometry, series]]) => {
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
        row: table.rows.findIndex((row) => {
          if (layer.xAccessor) {
            if (layersAlreadyFormatted[layer.xAccessor]) {
              // stringify the value to compare with the chart value
              return xAxisFormatter.convert(row[layer.xAccessor]) === xyGeometry.x;
            }
            return row[layer.xAccessor] === xyGeometry.x;
          }
        }),
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

    const xAxisFieldName = table.columns.find((el) => el.id === layer.xAccessor)?.meta?.field;
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
  };

  const brushHandler: BrushEndListener = ({ x }) => {
    if (!x) {
      return;
    }
    const [min, max] = x;
    if (!xAxisColumn || !isHistogramViz) {
      return;
    }

    const table = data.tables[filteredLayers[0].layerId];

    const xAxisColumnIndex = table.columns.findIndex((el) => el.id === filteredLayers[0].xAccessor);

    const timeFieldName = isTimeViz ? table.columns[xAxisColumnIndex]?.meta?.field : undefined;

    const context: LensBrushEvent['data'] = {
      range: [min, max],
      table,
      column: xAxisColumnIndex,
      timeFieldName,
    };
    onSelectRange(context);
  };

  return (
    <Chart>
      <Settings
        debugState={window._echDebugStateFlag ?? false}
        showLegend={
          legend.isVisible && !legend.showSingleSeries
            ? chartHasMoreThanOneSeries
            : legend.isVisible
        }
        legendPosition={legend.position}
        showLegendExtra={false}
        theme={{
          ...chartTheme,
          barSeriesStyle: {
            ...chartTheme.barSeriesStyle,
            ...valueLabelsStyling,
          },
          background: {
            color: undefined, // removes background for embeddables
          },
        }}
        baseTheme={chartBaseTheme}
        tooltip={{
          headerFormatter: (d) => safeXAccessorLabelRenderer(d.value),
        }}
        rotation={shouldRotate ? 90 : 0}
        xDomain={xDomain}
        onBrushEnd={renderMode !== 'noInteractivity' ? brushHandler : undefined}
        onElementClick={renderMode !== 'noInteractivity' ? clickHandler : undefined}
      />

      <Axis
        id="x"
        position={shouldRotate ? Position.Left : Position.Bottom}
        title={xTitle}
        gridLine={{
          visible: gridlinesVisibilitySettings?.x,
          strokeWidth: 2,
        }}
        hide={filteredLayers[0].hide || !filteredLayers[0].xAccessor}
        tickFormat={(d) => safeXAccessorLabelRenderer(d)}
        style={{
          tickLabel: {
            visible: tickLabelsVisibilitySettings?.x,
          },
          axisTitle: {
            visible: axisTitlesVisibilitySettings.x,
          },
        }}
      />

      {yAxesConfiguration.map((axis) => (
        <Axis
          key={axis.groupId}
          id={axis.groupId}
          groupId={axis.groupId}
          position={axis.position}
          title={getYAxesTitles(axis.series, axis.groupId)}
          gridLine={{
            visible:
              axis.groupId === 'right'
                ? gridlinesVisibilitySettings?.yRight
                : gridlinesVisibilitySettings?.yLeft,
          }}
          hide={filteredLayers[0].hide}
          tickFormat={(d) => axis.formatter?.convert(d) || ''}
          style={getYAxesStyle(axis.groupId)}
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
            palette,
          } = layer;
          const columnToLabelMap: Record<string, string> = columnToLabel
            ? JSON.parse(columnToLabel)
            : {};

          const table = data.tables[layerId];

          const isPrimitive = (value: unknown): boolean =>
            value != null && typeof value !== 'object';

          // what if row values are not primitive? That is the case of, for instance, Ranges
          // remaps them to their serialized version with the formatHint metadata
          // In order to do it we need to make a copy of the table as the raw one is required for more features (filters, etc...) later on
          const tableConverted: Datatable = {
            ...table,
            rows: table.rows.map((row: DatatableRow) => {
              const newRow = { ...row };
              for (const column of table.columns) {
                const record = newRow[column.id];
                if (record && !isPrimitive(record)) {
                  newRow[column.id] = formatFactory(column.meta.params).convert(record);
                }
              }
              return newRow;
            }),
          };

          // save the id of the layer with the custom table
          table.columns.reduce<Record<string, boolean>>(
            (alreadyFormatted: Record<string, boolean>, { id }) => {
              if (alreadyFormatted[id]) {
                return alreadyFormatted;
              }
              alreadyFormatted[id] = table.rows.some(
                (row, i) => row[id] !== tableConverted.rows[i][id]
              );
              return alreadyFormatted;
            },
            layersAlreadyFormatted
          );

          // For date histogram chart type, we're getting the rows that represent intervals without data.
          // To not display them in the legend, they need to be filtered out.
          const rows = tableConverted.rows.filter(
            (row) =>
              !(xAccessor && typeof row[xAccessor] === 'undefined') &&
              !(
                splitAccessor &&
                typeof row[splitAccessor] === 'undefined' &&
                typeof row[accessor] === 'undefined'
              )
          );

          if (!xAccessor) {
            rows.forEach((row) => {
              row.unifiedX = i18n.translate('xpack.lens.xyChart.emptyXLabel', {
                defaultMessage: '(empty)',
              });
            });
          }

          const yAxis = yAxesConfiguration.find((axisConfiguration) =>
            axisConfiguration.series.find((currentSeries) => currentSeries.accessor === accessor)
          );

          const seriesProps: SeriesSpec = {
            splitSeriesAccessors: splitAccessor ? [splitAccessor] : [],
            stackAccessors: seriesType.includes('stacked') ? [xAccessor as string] : [],
            id: `${splitAccessor}-${accessor}`,
            xAccessor: xAccessor || 'unifiedX',
            yAccessors: [accessor],
            data: rows,
            xScaleType: xAccessor ? xScaleType : 'ordinal',
            yScaleType,
            color: ({ yAccessor, seriesKeys }) => {
              const overwriteColor = getSeriesColor(layer, accessor);
              if (overwriteColor !== null) {
                return overwriteColor;
              }
              const colorAssignment = colorAssignments[palette.name];
              const seriesLayers: SeriesLayer[] = [
                {
                  name: splitAccessor ? String(seriesKeys[0]) : columnToLabelMap[seriesKeys[0]],
                  totalSeriesAtDepth: colorAssignment.totalSeriesCount,
                  rankAtDepth: colorAssignment.getRank(
                    layer,
                    String(seriesKeys[0]),
                    String(yAccessor)
                  ),
                },
              ];
              return paletteService.get(palette.name).getColor(
                seriesLayers,
                {
                  maxDepth: 1,
                  behindText: false,
                  totalSeries: colorAssignment.totalSeriesCount,
                  syncColors,
                },
                palette.params
              );
            },
            groupId: yAxis?.groupId,
            enableHistogramMode:
              isHistogram &&
              (seriesType.includes('stacked') || !splitAccessor) &&
              (seriesType.includes('stacked') ||
                !seriesType.includes('bar') ||
                !chartHasMoreThanOneBarSeries),
            stackMode: seriesType.includes('percentage') ? StackMode.Percentage : undefined,
            timeZone,
            areaSeriesStyle: {
              point: {
                visible: !xAccessor,
                radius: 5,
              },
            },
            lineSeriesStyle: {
              point: {
                visible: !xAccessor,
                radius: 5,
              },
            },
            name(d) {
              const splitHint = table.columns.find((col) => col.id === splitAccessor)?.meta?.params;

              // For multiple y series, the name of the operation is used on each, either:
              // * Key - Y name
              // * Formatted value - Y name
              if (accessors.length > 1) {
                const result = d.seriesKeys
                  .map((key: string | number, i) => {
                    if (
                      i === 0 &&
                      splitHint &&
                      splitAccessor &&
                      !layersAlreadyFormatted[splitAccessor]
                    ) {
                      return formatFactory(splitHint).convert(key);
                    }
                    return splitAccessor && i === 0 ? key : columnToLabelMap[key] ?? '';
                  })
                  .join(' - ');
                return result;
              }

              // For formatted split series, format the key
              // This handles splitting by dates, for example
              if (splitHint) {
                if (splitAccessor && layersAlreadyFormatted[splitAccessor]) {
                  return d.seriesKeys[0];
                }
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
            case 'bar_percentage_stacked':
            case 'bar_horizontal':
            case 'bar_horizontal_stacked':
            case 'bar_horizontal_percentage_stacked':
              const valueLabelsSettings = {
                displayValueSettings: {
                  // This format double fixes two issues in elastic-chart
                  // * when rotating the chart, the formatter is not correctly picked
                  // * in some scenarios value labels are not strings, and this breaks the elastic-chart lib
                  valueFormatter: (d: unknown) => yAxis?.formatter?.convert(d) || '',
                  showValueLabel: shouldShowValueLabels && valueLabels !== 'hide',
                  isAlternatingValueLabel: false,
                  isValueContainedInElement: true,
                  hideClippedValue: true,
                },
              };
              return <BarSeries key={index} {...seriesProps} {...valueLabelsSettings} />;
            case 'area_stacked':
            case 'area_percentage_stacked':
              return (
                <AreaSeries key={index} {...seriesProps} fit={getFitOptions(fittingFunction)} />
              );
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

function getFilteredLayers(layers: LayerArgs[], data: LensMultiTable) {
  return layers.filter(({ layerId, xAccessor, accessors, splitAccessor }) => {
    return !(
      !accessors.length ||
      !data.tables[layerId] ||
      data.tables[layerId].rows.length === 0 ||
      (xAccessor &&
        data.tables[layerId].rows.every((row) => typeof row[xAccessor] === 'undefined')) ||
      // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
      (!xAccessor &&
        splitAccessor &&
        data.tables[layerId].rows.every((row) => typeof row[splitAccessor] === 'undefined'))
    );
  });
}

function assertNever(x: never): never {
  throw new Error('Unexpected series type: ' + x);
}
