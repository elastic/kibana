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
import {
  Chart,
  Datum,
  Settings,
  Partition,
  PartitionConfig,
  PartitionLayer,
  PartitionLayout,
  PartialTheme,
  PartitionFillLabel,
  RecursivePartial,
  LayerValue,
} from '@elastic/charts';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';
import { FormatFactory } from '../types';
import { VisualizationContainer } from '../visualization_container';
import { CHART_NAMES } from './constants';
import { ColumnGroups, PieExpressionProps } from './types';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { getSliceValueWithFallback, getFilterContext } from './render_helpers';

const EMPTY_SLICE = Symbol('empty_slice');

const sortedColors = euiPaletteColorBlindBehindText();

export function PieComponent(
  props: PieExpressionProps & {
    formatFactory: FormatFactory;
    chartTheme: Exclude<PartialTheme, undefined>;
    isDarkMode: boolean;
    executeTriggerActions: UiActionsStart['executeTriggerActions'];
  }
) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  const { chartTheme, isDarkMode, executeTriggerActions } = props;
  const {
    shape,
    slices,
    metric,
    numberDisplay,
    categoryDisplay,
    legendDisplay,
    hideLabels,
  } = props.args;

  if (!hideLabels) {
    firstTable.columns.forEach(column => {
      formatters[column.id] = props.formatFactory(column.formatHint);
    });
  }

  // The datatable for pie charts should include subtotals, like this:
  // [bucket, subtotal, bucket, count]
  // But the user only configured [bucket, bucket, count]
  const columnGroups: ColumnGroups = [];
  firstTable.columns.forEach(col => {
    if (slices.includes(col.id)) {
      columnGroups.push({
        col,
        metrics: [],
      });
    } else if (columnGroups.length > 0) {
      columnGroups[columnGroups.length - 1].metrics.push(col);
    }
  });

  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: true,
    valueFont: {
      fontWeight: 800,
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
        shape === 'treemap' && layerIndex < columnGroups.length - 1
          ? {
              ...fillLabel,
              // For the treemap, hide all text except for the most detailed slice
              // Otherwise text will overlap and be unreadable
              valueFormatter: () => '',
              textColor: 'rgba(0,0,0,0)',
            }
          : fillLabel,
      shape: {
        fillColor: d => {
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
            return outputColor;
          }

          const lighten = (d.depth - 1) / (columnGroups.length * 2);
          return color(outputColor, 'hsl')
            .lighten(lighten)
            .hex();
        },
      },
    };
  });

  const config: RecursivePartial<PartitionConfig> = {
    partitionLayout: shape === 'treemap' ? PartitionLayout.treemap : PartitionLayout.sunburst,
    fontFamily: chartTheme.barSeriesStyle?.displayValue?.fontFamily,
    // Use full height of embeddable unless user wants to display linked labels
    outerSizeRatio: categoryDisplay === 'link' ? 0.8 : 1,
    specialFirstInnermostSector: false,
    minFontSize: 10,
    maxFontSize: 16,
    // Labels are added outside the outer ring when the slice is too small
    linkLabel: {
      fontSize: 12,
      // Dashboard background color is affected by dark mode, which we need
      // to account for in outer labels
      // This does not handle non-dashboard embeddables, which are allowed to
      // have different backgrounds.
      textColor: isDarkMode ? 'white' : 'black',
    },
    sectorLineStroke: isDarkMode ? 'rgb(26, 27, 32)' : undefined,
    sectorLineWidth: 1.5,
    circlePadding: 4,
  };
  if (shape !== 'treemap') {
    config.emptySizeRatio = shape === 'donut' ? 0.3 : 0;
  }
  if (categoryDisplay === 'link') {
    config.linkLabel!.maximumSection = Number.POSITIVE_INFINITY;
  }
  if (hideLabels || categoryDisplay === 'hide') {
    // Force all labels to be linked, then prevent links from showing
    config.linkLabel = { maxCount: 0, maximumSection: Number.POSITIVE_INFINITY };
  } else if (categoryDisplay === 'inside') {
    // Prevent links from showing
    config.linkLabel = { maxCount: 0 };
  }
  const metricColumn = firstTable.columns.find(c => c.id === metric)!;
  const percentFormatter =
    metricColumn.formatHint && metricColumn.formatHint?.id === 'percent'
      ? formatters[metricColumn.id]
      : props.formatFactory({ id: 'percent' });

  const [state, setState] = useState({ isReady: false });
  // It takes a cycle for the chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

  const reverseGroups = [...columnGroups].reverse();

  const hasNegative = firstTable.rows.some(row => {
    const value = row[metricColumn.id];
    return typeof value === 'number' && value < 0;
  });
  const hasZeroes = firstTable.rows.some(row => {
    const value = row[metricColumn.id];
    return typeof value === 'number' && value === 0;
  });
  if (firstTable.rows.length === 0 || hasNegative) {
    return (
      <EuiText className="lnsChart__empty" textAlign="center" color="subdued" size="xs">
        {hasNegative ? (
          <FormattedMessage
            id="xpack.lens.pie.pieWithNegativeWarningLabel"
            defaultMessage="{chartType} charts can't render with negative values. Try a different chart type."
            values={{
              chartType: CHART_NAMES[shape].label,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.lens.xyVisualization.noDataLabel"
            defaultMessage="No results found"
          />
        )}
      </EuiText>
    );
  }

  return (
    <VisualizationContainer className="lnsPieExpression__container" isReady={state.isReady}>
      <Chart>
        <Settings
          showLegend={!hideLabels && (legendDisplay === 'nested' || columnGroups.length > 1)}
          legendMaxDepth={
            legendDisplay === 'nested' ? undefined : 1 /* Color is based only on first layer */
          }
          onElementClick={args => {
            const context = getFilterContext(
              args[0][0] as LayerValue[],
              columnGroups.map(({ col }) => col.id),
              firstTable
            );

            executeTriggerActions(VIS_EVENT_TO_TRIGGER.filter, context);
          }}
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
        />
      </Chart>
    </VisualizationContainer>
  );
}
