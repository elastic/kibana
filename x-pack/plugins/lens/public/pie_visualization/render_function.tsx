/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
import {
  Chart,
  Datum,
  LayerValue,
  Partition,
  PartitionConfig,
  PartitionLayer,
  PartitionLayout,
  PartitionFillLabel,
  RecursivePartial,
  Position,
  Settings,
} from '@elastic/charts';
import { FormatFactory, LensFilterEvent } from '../types';
import { VisualizationContainer } from '../visualization_container';
import { CHART_NAMES, DEFAULT_PERCENT_DECIMALS } from './constants';
import { PieExpressionProps } from './types';
import { getSliceValue, getFilterContext } from './render_helpers';
import { EmptyPlaceholder } from '../shared_components';
import './visualization.scss';
import { desanitizeFilterContext } from '../utils';
import {
  ChartsPluginSetup,
  PaletteRegistry,
  SeriesLayer,
} from '../../../../../src/plugins/charts/public';
import { LensIconChartDonut } from '../assets/chart_donut';

const EMPTY_SLICE = Symbol('empty_slice');

export function PieComponent(
  props: PieExpressionProps & {
    formatFactory: FormatFactory;
    chartsThemeService: ChartsPluginSetup['theme'];
    paletteService: PaletteRegistry;
    onClickValue: (data: LensFilterEvent['data']) => void;
  }
) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  const { chartsThemeService, paletteService, onClickValue } = props;
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
    hideLabels,
    palette,
  } = props.args;
  const chartTheme = chartsThemeService.useChartsTheme();
  const chartBaseTheme = chartsThemeService.useChartsBaseTheme();

  if (!hideLabels) {
    firstTable.columns.forEach((column) => {
      formatters[column.id] = props.formatFactory(column.meta.params);
    });
  }

  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: true,
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
      shape: {
        fillColor: (d) => {
          const seriesLayers: SeriesLayer[] = [];

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

          if (shape === 'treemap') {
            // Only highlight the innermost color of the treemap, as it accurately represents area
            if (layerIndex < bucketColumns.length - 1) {
              return 'rgba(0,0,0,0)';
            }
            // only use the top level series layer for coloring
            if (seriesLayers.length > 1) {
              seriesLayers.pop();
            }
          }

          const outputColor = paletteService.get(palette.name).getColor(
            seriesLayers,
            {
              behindText: categoryDisplay !== 'hide',
              maxDepth: bucketColumns.length,
              totalSeries: totalSeriesCount,
            },
            palette.params
          );

          return outputColor || 'rgba(0,0,0,0)';
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
      textColor: chartTheme.axes?.axisTitle?.fill,
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
      pattern: `0,0.[${'0'.repeat(percentDecimals ?? DEFAULT_PERCENT_DECIMALS)}]%`,
    },
  });

  const [state, setState] = useState({ isReady: false });
  // It takes a cycle for the chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

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
    return <EmptyPlaceholder icon={LensIconChartDonut} />;
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
    <VisualizationContainer
      reportTitle={props.args.title}
      reportDescription={props.args.description}
      className="lnsPieExpression__container"
      isReady={state.isReady}
    >
      <Chart>
        <Settings
          // Legend is hidden in many scenarios
          // - Tiny preview
          // - Treemap does not need a legend because it uses category labels
          // - Single layer pie/donut usually shows text, does not need legend
          showLegend={
            !hideLabels &&
            (legendDisplay === 'show' ||
              (legendDisplay === 'default' && bucketColumns.length > 1 && shape !== 'treemap'))
          }
          legendPosition={legendPosition || Position.Right}
          legendMaxDepth={nestedLegend ? undefined : 1 /* Color is based only on first layer */}
          onElementClick={(args) => {
            const context = getFilterContext(args[0][0] as LayerValue[], groups, firstTable);

            onClickValue(desanitizeFilterContext(context));
          }}
          theme={{
            ...chartTheme,
            background: {
              color: undefined, // removes background for embeddables
            },
          }}
          baseTheme={chartBaseTheme}
        />
        <Partition
          id={shape}
          data={firstTable.rows}
          valueAccessor={(d: Datum) => getSliceValue(d, metricColumn)}
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
