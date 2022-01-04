/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Required } from '@kbn/utility-types';
import { EuiText } from '@elastic/eui';
import {
  Chart,
  Datum,
  LayerValue,
  Partition,
  PartitionLayer,
  Position,
  Settings,
  ElementClickListener,
  PartialTheme,
} from '@elastic/charts';
import { RenderMode } from 'src/plugins/expressions';
import type { LensFilterEvent } from '../types';
import { VisualizationContainer } from '../visualization_container';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PartitionChartsMeta } from './partition_charts_meta';
import type { FormatFactory } from '../../common';
import type { PieExpressionProps } from '../../common/expressions';
import {
  getSliceValue,
  getFilterContext,
  isTreemapOrMosaicShape,
  byDataColorPaletteMap,
  extractUniqTermsMap,
} from './render_helpers';
import { EmptyPlaceholder } from '../../../../../src/plugins/charts/public';
import './visualization.scss';
import {
  ChartsPluginSetup,
  PaletteRegistry,
  SeriesLayer,
} from '../../../../../src/plugins/charts/public';
import { LensIconChartDonut } from '../assets/chart_donut';
import { getLegendAction } from './get_legend_action';

declare global {
  interface Window {
    /**
     * Flag used to enable debugState on elastic charts
     */
    _echDebugStateFlag?: boolean;
  }
}

const EMPTY_SLICE = Symbol('empty_slice');

export function PieComponent(
  props: PieExpressionProps & {
    formatFactory: FormatFactory;
    chartsThemeService: ChartsPluginSetup['theme'];
    interactive?: boolean;
    paletteService: PaletteRegistry;
    onClickValue: (data: LensFilterEvent['data']) => void;
    renderMode: RenderMode;
    syncColors: boolean;
  }
) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  const { chartsThemeService, paletteService, syncColors, onClickValue } = props;
  const {
    shape,
    groups,
    metric,
    numberDisplay,
    categoryDisplay,
    legendDisplay,
    legendPosition,
    nestedLegend,
    percentDecimals,
    emptySizeRatio,
    legendMaxLines,
    truncateLegend,
    hideLabels,
    palette,
    showValuesInLegend,
  } = props.args;
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();
  const isDarkMode = chartsThemeService.useDarkMode();

  if (!hideLabels) {
    firstTable.columns.forEach((column) => {
      formatters[column.id] = props.formatFactory(column.meta.params);
    });
  }

  const fillLabel: PartitionLayer['fillLabel'] = {
    valueFont: {
      fontWeight: 700,
    },
  };

  if (numberDisplay === 'hidden') {
    // Hides numbers from appearing inside chart, but they still appear in linkLabel
    // and tooltips.
    fillLabel.valueFormatter = () => '';
  }

  const bucketColumns = firstTable.columns.filter((col) => groups.includes(col.id));
  const totalSeriesCount = uniq(
    firstTable.rows.map((row) => {
      return bucketColumns.map(({ id: columnId }) => row[columnId]).join(',');
    })
  ).length;

  const shouldUseByDataPalette = !syncColors && ['mosaic'].includes(shape) && bucketColumns[1]?.id;
  let byDataPalette: ReturnType<typeof byDataColorPaletteMap>;
  if (shouldUseByDataPalette) {
    byDataPalette = byDataColorPaletteMap(
      firstTable,
      bucketColumns[1].id,
      paletteService.get(palette.name),
      palette
    );
  }

  let sortingMap: Record<string, number> = {};
  if (shape === 'mosaic') {
    sortingMap = extractUniqTermsMap(firstTable, bucketColumns[0].id);
  }

  const layers: PartitionLayer[] = bucketColumns.map((col, layerIndex) => {
    return {
      groupByRollup: (d: Datum) => d[col.id] ?? EMPTY_SLICE,
      showAccessor: (d: Datum) => d !== EMPTY_SLICE,
      nodeLabel: (d: unknown) => {
        if (hideLabels || d === EMPTY_SLICE) {
          return '';
        }
        if (col.meta.params) {
          return formatters[col.id].convert(d) ?? '';
        }
        return String(d);
      },
      fillLabel,
      sortPredicate: PartitionChartsMeta[shape].sortPredicate?.(bucketColumns, sortingMap),
      shape: {
        fillColor: (d) => {
          const seriesLayers: SeriesLayer[] = [];

          // Mind the difference here: the contrast computation for the text ignores the alpha/opacity
          // therefore change it for dask mode
          const defaultColor = isDarkMode ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';

          // Color is determined by round-robin on the index of the innermost slice
          // This has to be done recursively until we get to the slice index
          let tempParent: typeof d | typeof d['parent'] = d;

          while (tempParent.parent && tempParent.depth > 0) {
            seriesLayers.unshift({
              name: String(tempParent.parent.children[tempParent.sortIndex][0]),
              rankAtDepth: tempParent.sortIndex,
              totalSeriesAtDepth: tempParent.parent.children.length,
            });
            tempParent = tempParent.parent;
          }

          if (byDataPalette && seriesLayers[1]) {
            return byDataPalette.getColor(seriesLayers[1].name) || defaultColor;
          }

          if (isTreemapOrMosaicShape(shape)) {
            // Only highlight the innermost color of the treemap, as it accurately represents area
            if (layerIndex < bucketColumns.length - 1) {
              return defaultColor;
            }
            // only use the top level series layer for coloring
            if (seriesLayers.length > 1) {
              seriesLayers.pop();
            }
          }

          const outputColor = paletteService.get(palette.name).getCategoricalColor(
            seriesLayers,
            {
              behindText: categoryDisplay !== 'hide' || isTreemapOrMosaicShape(shape),
              maxDepth: bucketColumns.length,
              totalSeries: totalSeriesCount,
              syncColors,
            },
            palette.params
          );

          return outputColor || defaultColor;
        },
      },
    };
  });

  const { legend, partitionType, label: chartType } = PartitionChartsMeta[shape];

  const themeOverrides: Required<PartialTheme, 'partition'> = {
    chartMargins: { top: 0, bottom: 0, left: 0, right: 0 },
    background: {
      color: undefined, // removes background for embeddables
    },
    legend: {
      labelOptions: { maxLines: truncateLegend ? legendMaxLines ?? 1 : 0 },
    },
    partition: {
      fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
      outerSizeRatio: 1,
      minFontSize: 10,
      maxFontSize: 16,
      // Labels are added outside the outer ring when the slice is too small
      linkLabel: {
        maxCount: 5,
        fontSize: 11,
        // Dashboard background color is affected by dark mode, which we need
        // to account for in outer labels
        // This does not handle non-dashboard embeddables, which are allowed to
        // have different backgrounds.
        textColor: chartTheme.axes?.axisTitle?.fill,
      },
      sectorLineStroke: chartTheme.lineSeriesStyle?.point?.fill,
      sectorLineWidth: 1.5,
      circlePadding: 4,
    },
  };
  if (isTreemapOrMosaicShape(shape)) {
    if (hideLabels || categoryDisplay === 'hide') {
      themeOverrides.partition.fillLabel = { textColor: 'rgba(0,0,0,0)' };
    }
  } else {
    themeOverrides.partition.emptySizeRatio = shape === 'donut' ? emptySizeRatio : 0;

    if (hideLabels || categoryDisplay === 'hide') {
      // Force all labels to be linked, then prevent links from showing
      themeOverrides.partition.linkLabel = {
        maxCount: 0,
        maximumSection: Number.POSITIVE_INFINITY,
      };
    } else if (categoryDisplay === 'inside') {
      // Prevent links from showing
      themeOverrides.partition.linkLabel = { maxCount: 0 };
    } else {
      // if it contains any slice below 2% reduce the ratio
      // first step: sum it up the overall sum
      const overallSum = firstTable.rows.reduce((sum, row) => sum + row[metric!], 0);
      const slices = firstTable.rows.map((row) => row[metric!] / overallSum);
      const smallSlices = slices.filter((value) => value < 0.02).length;
      if (smallSlices) {
        // shrink up to 20% to give some room for the linked values
        themeOverrides.partition.outerSizeRatio = 1 / (1 + Math.min(smallSlices * 0.05, 0.2));
      }
    }
  }
  const metricColumn = firstTable.columns.find((c) => c.id === metric)!;
  const percentFormatter = props.formatFactory({
    id: 'percent',
    params: {
      pattern: `0,0.[${'0'.repeat(percentDecimals ?? DEFAULT_PERCENT_DECIMALS)}]%`,
    },
  });

  const hasNegative = firstTable.rows.some((row) => {
    const value = row[metricColumn.id];
    return typeof value === 'number' && value < 0;
  });

  const isMetricEmpty = firstTable.rows.every((row) => {
    return !row[metricColumn.id];
  });

  const isEmpty =
    firstTable.rows.length === 0 ||
    firstTable.rows.every((row) => groups.every((colId) => typeof row[colId] === 'undefined')) ||
    isMetricEmpty;

  if (isEmpty) {
    return (
      <VisualizationContainer className="lnsPieExpression__container">
        <EmptyPlaceholder icon={LensIconChartDonut} />
      </VisualizationContainer>
    );
  }

  if (hasNegative) {
    return (
      <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
        <FormattedMessage
          id="xpack.lens.pie.pieWithNegativeWarningLabel"
          defaultMessage="{chartType} charts can't render with negative values."
          values={{
            chartType,
          }}
        />
      </EuiText>
    );
  }

  const onElementClickHandler: ElementClickListener = (args) => {
    const context = getFilterContext(args[0][0] as LayerValue[], groups, firstTable);

    onClickValue(context);
  };

  return (
    <VisualizationContainer className="lnsPieExpression__container">
      <Chart>
        <Settings
          tooltip={{ boundary: document.getElementById('app-fixed-viewport') ?? undefined }}
          debugState={window._echDebugStateFlag ?? false}
          // Legend is hidden in many scenarios
          // - Tiny preview
          // - Treemap does not need a legend because it uses category labels
          // - Single layer pie/donut usually shows text, does not need legend
          showLegend={
            !hideLabels &&
            (legendDisplay === 'show' ||
              (legendDisplay === 'default' &&
                (legend.getShowLegendDefault?.(bucketColumns) ?? false)))
          }
          flatLegend={legend.flat}
          showLegendExtra={showValuesInLegend}
          legendPosition={legendPosition || Position.Right}
          legendMaxDepth={nestedLegend ? undefined : 1 /* Color is based only on first layer */}
          onElementClick={props.interactive ?? true ? onElementClickHandler : undefined}
          legendAction={props.interactive ? getLegendAction(firstTable, onClickValue) : undefined}
          theme={[themeOverrides, chartTheme]}
          baseTheme={chartBaseTheme}
        />
        <Partition
          id={shape}
          data={firstTable.rows}
          layout={partitionType}
          specialFirstInnermostSector
          valueAccessor={(d: Datum) => getSliceValue(d, metricColumn)}
          percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
          valueGetter={hideLabels || numberDisplay === 'value' ? undefined : 'percent'}
          valueFormatter={(d: number) => (hideLabels ? '' : formatters[metricColumn.id].convert(d))}
          layers={layers}
          topGroove={hideLabels || categoryDisplay === 'hide' ? 0 : undefined}
        />
      </Chart>
    </VisualizationContainer>
  );
}
