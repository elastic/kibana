/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import color from 'color';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
// @ts-ignore no types
import { euiPaletteColorBlindBehindText } from '@elastic/eui/lib/services';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import {
  Chart,
  Datum,
  Settings,
  Partition,
  PartitionConfig,
  PartitionLayer,
  PartitionLayout,
  PartitionFillLabel,
  RecursivePartial,
  LayerValue,
} from '@elastic/charts';
import { FormatFactory, LensFilterEvent } from '../types';
import { VisualizationContainer } from '../visualization_container';
import { CHART_NAMES, DEFAULT_PERCENT_DECIMALS } from './constants';
import { ColumnGroups, PieExpressionProps } from './types';
import { getSliceValueWithFallback, getFilterContext } from './render_helpers';
import { EmptyPlaceholder } from '../shared_components';
import './visualization.scss';
import { desanitizeFilterContext } from '../utils';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

const EMPTY_SLICE = Symbol('empty_slice');

const sortedColors = euiPaletteColorBlindBehindText();

export function PieComponent(
  props: PieExpressionProps & {
    formatFactory: FormatFactory;
    chartsThemeService: ChartsPluginSetup['theme'];
    onClickValue: (data: LensFilterEvent['data']) => void;
  }
) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  const { chartsThemeService, onClickValue } = props;
  const {
    shape,
    groups,
    metric,
    numberDisplay,
    categoryDisplay,
    legendDisplay,
    nestedLegend,
    percentDecimals,
    hideLabels,
  } = props.args;
  const isDarkMode = chartsThemeService.useDarkMode();
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();

  if (!hideLabels) {
    firstTable.columns.forEach((column) => {
      formatters[column.id] = props.formatFactory(column.formatHint);
    });
  }

  // The datatable for pie charts should include subtotals, like this:
  // [bucket, subtotal, bucket, count]
  // But the user only configured [bucket, bucket, count]
  const columnGroups: ColumnGroups = [];
  firstTable.columns.forEach((col) => {
    if (groups.includes(col.id)) {
      columnGroups.push({
        col,
        metrics: [],
      });
    } else if (columnGroups.length > 0) {
      columnGroups[columnGroups.length - 1].metrics.push(col);
    }
  });

  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: false,
    valueFont: {
      fontWeight: 700,
    },
  };

  if (numberDisplay === 'hidden') {
    // Hides numbers from appearing inside chart, but they still appear in linkLabel
    // and tooltips.
    fillLabel.valueFormatter = () => '';
  }

  const layers: PartitionLayer[] = columnGroups.map(({ col }, layerIndex) => {
    return {
      groupByRollup: (d: Datum) => d[col.id] ?? EMPTY_SLICE,
      showAccessor: (d: Datum) => d !== EMPTY_SLICE,
      nodeLabel: (d: unknown) => {
        if (hideLabels || d === EMPTY_SLICE) {
          return '';
        }
        if (col.formatHint) {
          return formatters[col.id].convert(d) ?? '';
        }
        return String(d);
      },
      fillLabel:
        isDarkMode &&
        shape === 'treemap' &&
        layerIndex < columnGroups.length - 1 &&
        categoryDisplay !== 'hide'
          ? { ...fillLabel, textColor: euiDarkVars.euiTextColor }
          : fillLabel,
      shape: {
        fillColor: (d) => {
          // Color is determined by round-robin on the index of the innermost slice
          // This has to be done recursively until we get to the slice index
          let parentIndex = 0;
          let tempParent: typeof d | typeof d['parent'] = d;
          while (tempParent.parent && tempParent.depth > 0) {
            parentIndex = tempParent.sortIndex;
            tempParent = tempParent.parent;
          }

          // Look up round-robin color from default palette
          const outputColor = sortedColors[parentIndex % sortedColors.length];

          if (shape === 'treemap') {
            // Only highlight the innermost color of the treemap, as it accurately represents area
            return layerIndex < columnGroups.length - 1 ? 'rgba(0,0,0,0)' : outputColor;
          }

          const lighten = (d.depth - 1) / (columnGroups.length * 2);
          return color(outputColor, 'hsl').lighten(lighten).hex();
        },
      },
    };
  });

  const config: RecursivePartial<PartitionConfig> = {
    partitionLayout: shape === 'treemap' ? PartitionLayout.treemap : PartitionLayout.sunburst,
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
    outerSizeRatio: 1,
    specialFirstInnermostSector: true,
    clockwiseSectors: false,
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
      textColor: chartTheme.axes?.axisTitleStyle?.fill,
    },
    sectorLineStroke: chartTheme.lineSeriesStyle?.point?.fill,
    sectorLineWidth: 1.5,
    circlePadding: 4,
  };
  if (shape === 'treemap') {
    if (hideLabels || categoryDisplay === 'hide') {
      config.fillLabel = { textColor: 'rgba(0,0,0,0)' };
    }
  } else {
    config.emptySizeRatio = shape === 'donut' ? 0.3 : 0;

    if (hideLabels || categoryDisplay === 'hide') {
      // Force all labels to be linked, then prevent links from showing
      config.linkLabel = { maxCount: 0, maximumSection: Number.POSITIVE_INFINITY };
    } else if (categoryDisplay === 'inside') {
      // Prevent links from showing
      config.linkLabel = { maxCount: 0 };
    }
  }
  const metricColumn = firstTable.columns.find((c) => c.id === metric)!;
  const percentFormatter = props.formatFactory({
    id: 'percent',
    params: {
      pattern: `0,0.${'0'.repeat(percentDecimals ?? DEFAULT_PERCENT_DECIMALS)}%`,
    },
  });

  const [state, setState] = useState({ isReady: false });
  // It takes a cycle for the chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

  const reverseGroups = [...columnGroups].reverse();

  const hasNegative = firstTable.rows.some((row) => {
    const value = row[metricColumn.id];
    return typeof value === 'number' && value < 0;
  });
  const isEmpty =
    firstTable.rows.length === 0 ||
    firstTable.rows.every((row) =>
      groups.every((colId) => !row[colId] || typeof row[colId] === 'undefined')
    );

  if (isEmpty) {
    return <EmptyPlaceholder icon="visPie" />;
  }

  if (hasNegative) {
    return (
      <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
        <FormattedMessage
          id="xpack.lens.pie.pieWithNegativeWarningLabel"
          defaultMessage="{chartType} charts can't render with negative values. Try a different chart type."
          values={{
            chartType: CHART_NAMES[shape].label,
          }}
        />
      </EuiText>
    );
  }
  return (
    <VisualizationContainer className="lnsPieExpression__container" isReady={state.isReady}>
      <Chart>
        <Settings
          // Legend is hidden in many scenarios
          // - Tiny preview
          // - Treemap does not need a legend because it uses category labels
          // - Single layer pie/donut usually shows text, does not need legend
          showLegend={
            !hideLabels &&
            (legendDisplay === 'show' ||
              (legendDisplay === 'default' && columnGroups.length > 1 && shape !== 'treemap'))
          }
          legendMaxDepth={nestedLegend ? undefined : 1 /* Color is based only on first layer */}
          onElementClick={(args) => {
            const context = getFilterContext(
              args[0][0] as LayerValue[],
              columnGroups.map(({ col }) => col.id),
              firstTable
            );

            onClickValue(desanitizeFilterContext(context));
          }}
          theme={chartTheme}
          baseTheme={chartBaseTheme}
        />
        <Partition
          id={shape}
          data={firstTable.rows}
          valueAccessor={(d: Datum) => getSliceValueWithFallback(d, reverseGroups, metricColumn)}
          percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
          valueGetter={hideLabels || numberDisplay === 'value' ? undefined : 'percent'}
          valueFormatter={(d: number) => (hideLabels ? '' : formatters[metricColumn.id].convert(d))}
          layers={layers}
          config={config}
          topGroove={hideLabels || categoryDisplay === 'hide' ? 0 : undefined}
        />
      </Chart>
    </VisualizationContainer>
  );
}
