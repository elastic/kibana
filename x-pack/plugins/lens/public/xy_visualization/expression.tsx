/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './expression.scss';

import React, { useState, useEffect, useRef } from 'react';
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
  LayoutDirection,
  ElementClickListener,
  BrushEndListener,
  CurveType,
  LegendPositionConfig,
  LabelOverflowConstraint,
} from '@elastic/charts';
import { I18nProvider } from '@kbn/i18n/react';
import type {
  ExpressionRenderDefinition,
  Datatable,
  DatatableRow,
} from 'src/plugins/expressions/public';
import { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RenderMode } from 'src/plugins/expressions';
import type { ILensInterpreterRenderHandlers, LensFilterEvent, LensBrushEvent } from '../types';
import type { LensMultiTable, FormatFactory } from '../../common';
import { layerTypes } from '../../common';
import type { LayerArgs, SeriesType, XYChartProps } from '../../common/expressions';
import { visualizationTypes } from './types';
import { VisualizationContainer } from '../visualization_container';
import { isHorizontalChart, getSeriesColor } from './state_helpers';
import { search } from '../../../../../src/plugins/data/public';
import {
  ChartsPluginSetup,
  ChartsPluginStart,
  PaletteRegistry,
  SeriesLayer,
  useActiveCursor,
} from '../../../../../src/plugins/charts/public';
import { EmptyPlaceholder } from '../shared_components';
import { getFitOptions } from './fitting_functions';
import { getAxesConfiguration, GroupsConfiguration, validateExtent } from './axes_configuration';
import { getColorAssignments } from './color_assignment';
import { getXDomain, XyEndzones } from './x_domain';
import { getLegendAction } from './get_legend_action';
import {
  computeChartMargins,
  getThresholdRequiredPaddings,
  ThresholdAnnotations,
} from './expression_thresholds';

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

export type XYChartRenderProps = XYChartProps & {
  chartsThemeService: ChartsPluginSetup['theme'];
  chartsActiveCursorService: ChartsPluginStart['activeCursor'];
  paletteService: PaletteRegistry;
  formatFactory: FormatFactory;
  timeZone: string;
  minInterval: number | undefined;
  interactive?: boolean;
  onClickValue: (data: LensFilterEvent['data']) => void;
  onSelectRange: (data: LensBrushEvent['data']) => void;
  renderMode: RenderMode;
  syncColors: boolean;
};

export function calculateMinInterval({ args: { layers }, data }: XYChartProps) {
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
  const dateInterval = search.aggs.getDateHistogramMetaDataByDatatableColumn(xColumn)?.interval;
  if (!dateInterval) return;
  const intervalDuration = search.aggs.parseInterval(dateInterval);
  if (!intervalDuration) return;
  return intervalDuration.as('milliseconds');
}

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const getXyChartRenderer = (dependencies: {
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginStart['theme'];
  chartsActiveCursorService: ChartsPluginStart['activeCursor'];
  paletteService: PaletteRegistry;
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

    ReactDOM.render(
      <I18nProvider>
        <XYChartReportable
          {...config}
          formatFactory={dependencies.formatFactory}
          chartsActiveCursorService={dependencies.chartsActiveCursorService}
          chartsThemeService={dependencies.chartsThemeService}
          paletteService={dependencies.paletteService}
          timeZone={dependencies.timeZone}
          minInterval={calculateMinInterval(config)}
          interactive={handlers.isInteractive()}
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
  const VALUE_LABELS_MAX_FONTSIZE = 12;
  const VALUE_LABELS_MIN_FONTSIZE = 10;
  const VALUE_LABELS_VERTICAL_OFFSET = -10;
  const VALUE_LABELS_HORIZONTAL_OFFSET = 10;

  return {
    displayValue: {
      fontSize: { min: VALUE_LABELS_MIN_FONTSIZE, max: VALUE_LABELS_MAX_FONTSIZE },
      fill: { textContrast: true, textInverted: false, textBorder: 0 },
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
  const [isReady, setIsReady] = useState(false);

  // It takes a cycle for the XY chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setIsReady(true);
  }, [setIsReady]);

  return (
    <VisualizationContainer
      className="lnsXyExpression__container"
      isReady={isReady}
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
  chartsActiveCursorService,
  paletteService,
  minInterval,
  onClickValue,
  onSelectRange,
  interactive = true,
  syncColors,
}: XYChartRenderProps) {
  const {
    legend,
    layers,
    fittingFunction,
    gridlinesVisibilitySettings,
    valueLabels,
    hideEndzones,
    yLeftExtent,
    yRightExtent,
    valuesInLegend,
  } = args;
  const chartRef = useRef<Chart>(null);
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  const darkMode = chartsThemeService.useDarkMode();
  const filteredLayers = getFilteredLayers(layers, data);

  const handleCursorUpdate = useActiveCursor(chartsActiveCursorService, chartRef, {
    datatables: Object.values(data.tables),
  });

  if (filteredLayers.length === 0) {
    const icon: IconType = layers.length > 0 ? getIconForSeriesType(layers[0].seriesType) : 'bar';
    return <EmptyPlaceholder icon={icon} />;
  }
  const thresholdLayers = layers.filter((layer) => layer.layerType === layerTypes.THRESHOLD);

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

  const labelsOrientation = args.labelsOrientation || {
    x: 0,
    yLeft: 0,
    yRight: 0,
  };

  const filteredBarLayers = filteredLayers.filter((layer) => layer.seriesType.includes('bar'));

  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1) ||
    filteredBarLayers.some((layer) => layer.splitAccessor);

  const isTimeViz = data.dateRange && filteredLayers.every((l) => l.xScaleType === 'time');
  const isHistogramViz = filteredLayers.every((l) => l.isHistogram);

  const { baseDomain: rawXDomain, extendedDomain: xDomain } = getXDomain(
    filteredLayers,
    data,
    minInterval,
    Boolean(isTimeViz),
    Boolean(isHistogramViz)
  );

  const yAxesMap = {
    left: yAxesConfiguration.find(({ groupId }) => groupId === 'left'),
    right: yAxesConfiguration.find(({ groupId }) => groupId === 'right'),
  };
  const thresholdPaddings = getThresholdRequiredPaddings(thresholdLayers, yAxesMap);

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

  const getYAxesStyle = (groupId: 'left' | 'right') => {
    const tickVisible =
      groupId === 'right'
        ? tickLabelsVisibilitySettings?.yRight
        : tickLabelsVisibilitySettings?.yLeft;

    const style = {
      tickLabel: {
        visible: tickVisible,
        rotation:
          groupId === 'right'
            ? args.labelsOrientation?.yRight || 0
            : args.labelsOrientation?.yLeft || 0,
        padding:
          thresholdPaddings[groupId] != null
            ? {
                inner: thresholdPaddings[groupId],
              }
            : undefined,
      },
      axisTitle: {
        visible:
          groupId === 'right'
            ? axisTitlesVisibilitySettings?.yRight
            : axisTitlesVisibilitySettings?.yLeft,
        // if labels are not visible add the padding to the title
        padding:
          !tickVisible && thresholdPaddings[groupId] != null
            ? {
                inner: thresholdPaddings[groupId],
              }
            : undefined,
      },
    };
    return style;
  };

  const getYAxisDomain = (axis: GroupsConfiguration[number]) => {
    const extent = axis.groupId === 'left' ? yLeftExtent : yRightExtent;
    const hasBarOrArea = Boolean(
      axis.series.some((series) => {
        const seriesType = filteredLayers.find((l) => l.layerId === series.layer)?.seriesType;
        return seriesType?.includes('bar') || seriesType?.includes('area');
      })
    );
    const fit = !hasBarOrArea && extent.mode === 'dataBounds';
    let min: undefined | number;
    let max: undefined | number;

    if (extent.mode === 'custom') {
      const { inclusiveZeroError, boundaryError } = validateExtent(hasBarOrArea, extent);
      if (!inclusiveZeroError && !boundaryError) {
        min = extent.lowerBound;
        max = extent.upperBound;
      }
    } else {
      const axisHasThreshold = thresholdLayers.some(({ yConfig }) =>
        yConfig?.some(({ axisMode }) => axisMode === axis.groupId)
      );
      if (!fit && axisHasThreshold) {
        // Remove this once the chart will support automatic annotation fit for other type of charts
        for (const series of axis.series) {
          const table = data.tables[series.layer];
          for (const row of table.rows) {
            for (const column of table.columns) {
              if (column.id === series.accessor) {
                const value = row[column.id];
                if (typeof value === 'number') {
                  // keep the 0 in view
                  max = Math.max(value, max || 0, 0);
                  min = Math.min(value, min || 0, 0);
                }
              }
            }
          }
        }
        for (const { layerId, yConfig } of thresholdLayers) {
          const table = data.tables[layerId];
          for (const { axisMode, forAccessor } of yConfig || []) {
            if (axis.groupId === axisMode) {
              for (const row of table.rows) {
                const value = row[forAccessor];
                // keep the 0 in view
                max = Math.max(value, max || 0, 0);
                min = Math.min(value, min || 0, 0);
              }
            }
          }
        }
      }
    }

    return {
      fit,
      min,
      max,
    };
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

    const xColumn = table.columns.find((col) => col.id === layer.xAccessor);
    const currentXFormatter =
      layer.xAccessor && layersAlreadyFormatted[layer.xAccessor] && xColumn
        ? formatFactory(xColumn.meta.params)
        : xAxisFormatter;

    const rowIndex = table.rows.findIndex((row) => {
      if (layer.xAccessor) {
        if (layersAlreadyFormatted[layer.xAccessor]) {
          // stringify the value to compare with the chart value
          return currentXFormatter.convert(row[layer.xAccessor]) === xyGeometry.x;
        }
        return row[layer.xAccessor] === xyGeometry.x;
      }
    });

    const points = [
      {
        row: rowIndex,
        column: table.columns.findIndex((col) => col.id === layer.xAccessor),
        value: layer.xAccessor ? table.rows[rowIndex][layer.xAccessor] : xyGeometry.x,
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
    const currentColumnMeta = table.columns.find((el) => el.id === layer.xAccessor)?.meta;
    const xAxisFieldName = currentColumnMeta?.field;
    const isDateField = currentColumnMeta?.type === 'date';

    const context: LensFilterEvent['data'] = {
      data: points.map((point) => ({
        row: point.row,
        column: point.column,
        value: point.value,
        table,
      })),
      timeFieldName: xDomain && isDateField ? xAxisFieldName : undefined,
    };
    onClickValue(context);
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

  const legendInsideParams = {
    vAlign: legend.verticalAlignment ?? VerticalAlignment.Top,
    hAlign: legend?.horizontalAlignment ?? HorizontalAlignment.Right,
    direction: LayoutDirection.Vertical,
    floating: true,
    floatingColumns: legend?.floatingColumns ?? 1,
  } as LegendPositionConfig;

  return (
    <Chart ref={chartRef}>
      <Settings
        onPointerUpdate={handleCursorUpdate}
        debugState={window._echDebugStateFlag ?? false}
        showLegend={
          legend.isVisible && !legend.showSingleSeries
            ? chartHasMoreThanOneSeries
            : legend.isVisible
        }
        legendPosition={legend?.isInside ? legendInsideParams : legend.position}
        theme={{
          ...chartTheme,
          barSeriesStyle: {
            ...chartTheme.barSeriesStyle,
            ...valueLabelsStyling,
          },
          background: {
            color: undefined, // removes background for embeddables
          },
          legend: {
            labelOptions: { maxLines: legend.shouldTruncate ? legend?.maxLines ?? 1 : 0 },
          },
          // if not title or labels are shown for axes, add some padding if required by threshold markers
          chartMargins: {
            ...chartTheme.chartPaddings,
            ...computeChartMargins(
              thresholdPaddings,
              tickLabelsVisibilitySettings,
              axisTitlesVisibilitySettings,
              yAxesMap,
              shouldRotate
            ),
          },
        }}
        baseTheme={chartBaseTheme}
        tooltip={{
          boundary: document.getElementById('app-fixed-viewport') ?? undefined,
          headerFormatter: (d) => safeXAccessorLabelRenderer(d.value),
        }}
        allowBrushingLastHistogramBucket={Boolean(isTimeViz)}
        rotation={shouldRotate ? 90 : 0}
        xDomain={xDomain}
        onBrushEnd={interactive ? brushHandler : undefined}
        onElementClick={interactive ? clickHandler : undefined}
        legendAction={getLegendAction(
          filteredLayers,
          data.tables,
          onClickValue,
          formatFactory,
          layersAlreadyFormatted
        )}
        showLegendExtra={isHistogramViz && valuesInLegend}
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
            rotation: labelsOrientation?.x,
            padding:
              thresholdPaddings.bottom != null ? { inner: thresholdPaddings.bottom } : undefined,
          },
          axisTitle: {
            visible: axisTitlesVisibilitySettings.x,
            padding:
              !tickLabelsVisibilitySettings?.x && thresholdPaddings.bottom != null
                ? { inner: thresholdPaddings.bottom }
                : undefined,
          },
        }}
      />

      {yAxesConfiguration.map((axis) => {
        return (
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
            style={getYAxesStyle(axis.groupId as 'left' | 'right')}
            domain={getYAxisDomain(axis)}
          />
        );
      })}

      {!hideEndzones && (
        <XyEndzones
          baseDomain={rawXDomain}
          extendedDomain={xDomain}
          darkMode={darkMode}
          histogramMode={filteredLayers.every(
            (layer) =>
              layer.isHistogram &&
              (layer.seriesType.includes('stacked') || !layer.splitAccessor) &&
              (layer.seriesType.includes('stacked') ||
                !layer.seriesType.includes('bar') ||
                !chartHasMoreThanOneBarSeries)
          )}
        />
      )}

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

          // what if row values are not primitive? That is the case of, for instance, Ranges
          // remaps them to their serialized version with the formatHint metadata
          // In order to do it we need to make a copy of the table as the raw one is required for more features (filters, etc...) later on
          const tableConverted: Datatable = {
            ...table,
            rows: table.rows.map((row: DatatableRow) => {
              const newRow = { ...row };
              for (const column of table.columns) {
                const record = newRow[column.id];
                if (
                  record != null &&
                  // pre-format values for ordinal x axes because there can only be a single x axis formatter on chart level
                  (!isPrimitive(record) || (column.id === xAccessor && xScaleType === 'ordinal'))
                ) {
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

          const isStacked = seriesType.includes('stacked');
          const isPercentage = seriesType.includes('percentage');
          const isBarChart = seriesType.includes('bar');
          const enableHistogramMode =
            isHistogram &&
            (isStacked || !splitAccessor) &&
            (isStacked || !isBarChart || !chartHasMoreThanOneBarSeries);

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
            stackAccessors: isStacked ? [xAccessor as string] : [],
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
              return paletteService.get(palette.name).getCategoricalColor(
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
            enableHistogramMode,
            stackMode: isPercentage ? StackMode.Percentage : undefined,
            timeZone,
            areaSeriesStyle: {
              point: {
                visible: !xAccessor,
                radius: 5,
              },
              ...(args.fillOpacity && { area: { opacity: args.fillOpacity } }),
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

          const curveType = args.curveType ? CurveType[args.curveType] : undefined;

          switch (seriesType) {
            case 'line':
              return (
                <LineSeries
                  key={index}
                  {...seriesProps}
                  fit={getFitOptions(fittingFunction)}
                  curve={curveType}
                />
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
                  isValueContainedInElement: false,
                  isAlternatingValueLabel: false,
                  overflowConstraints: [
                    LabelOverflowConstraint.ChartEdges,
                    LabelOverflowConstraint.BarGeometry,
                  ],
                },
              };
              return <BarSeries key={index} {...seriesProps} {...valueLabelsSettings} />;
            case 'area_stacked':
            case 'area_percentage_stacked':
              return (
                <AreaSeries
                  key={index}
                  {...seriesProps}
                  fit={isPercentage ? 'zero' : getFitOptions(fittingFunction)}
                  curve={curveType}
                />
              );
            case 'area':
              return (
                <AreaSeries
                  key={index}
                  {...seriesProps}
                  fit={getFitOptions(fittingFunction)}
                  curve={curveType}
                />
              );
            default:
              return assertNever(seriesType);
          }
        })
      )}
      {thresholdLayers.length ? (
        <ThresholdAnnotations
          thresholdLayers={thresholdLayers}
          data={data}
          syncColors={syncColors}
          paletteService={paletteService}
          formatters={{
            left: yAxesMap.left?.formatter,
            right: yAxesMap.right?.formatter,
            bottom: xAxisFormatter,
          }}
          axesMap={{
            left: Boolean(yAxesMap.left),
            right: Boolean(yAxesMap.right),
          }}
          isHorizontal={shouldRotate}
        />
      ) : null}
    </Chart>
  );
}

function getFilteredLayers(layers: LayerArgs[], data: LensMultiTable) {
  return layers.filter(({ layerId, xAccessor, accessors, splitAccessor, layerType }) => {
    return (
      layerType === layerTypes.DATA &&
      !(
        !accessors.length ||
        !data.tables[layerId] ||
        data.tables[layerId].rows.length === 0 ||
        (xAccessor &&
          data.tables[layerId].rows.every((row) => typeof row[xAccessor] === 'undefined')) ||
        // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
        (!xAccessor &&
          splitAccessor &&
          data.tables[layerId].rows.every((row) => typeof row[splitAccessor] === 'undefined'))
      )
    );
  });
}

function assertNever(x: never): never {
  throw new Error('Unexpected series type: ' + x);
}
