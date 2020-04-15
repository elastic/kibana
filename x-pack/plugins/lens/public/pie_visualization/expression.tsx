/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import color from 'color';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText } from '@elastic/eui';
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
import {
  KibanaDatatableColumn,
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
  ExpressionFunctionDefinition,
} from 'src/plugins/expressions/public';
import { EmbeddableVisTriggerContext } from '../../../../../src/plugins/embeddable/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';
import { LensMultiTable, FormatFactory } from '../types';
import { VisualizationContainer } from '../visualization_container';
import { CHART_NAMES } from './constants';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { getExecuteTriggerActions } from './services';

const EMPTY_SLICE = Symbol('empty_slice');

interface Args {
  slices: string[];
  metric?: string;
  shape: 'pie' | 'donut' | 'treemap';
  hideLabels: boolean;
}

export interface PieProps {
  data: LensMultiTable;
  args: Args;
}

export interface PieRender {
  type: 'render';
  as: 'lens_pie_renderer';
  value: PieProps;
}

export const pie: ExpressionFunctionDefinition<'lens_pie', LensMultiTable, Args, PieRender> = {
  name: 'lens_pie',
  type: 'render',
  help: i18n.translate('xpack.lens.pie.expressionHelpLabel', {
    defaultMessage: 'Pie renderer',
  }),
  args: {
    slices: {
      types: ['string'],
      multi: true,
      help: '',
    },
    metric: {
      types: ['string'],
      help: '',
    },
    shape: {
      types: ['string'],
      options: ['pie', 'donut', 'treemap'],
      help: '',
    },
    hideLabels: {
      types: ['boolean'],
      help: '',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: Args) {
    return {
      type: 'render',
      as: 'lens_pie_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

export const getPieRenderer = (dependencies: {
  formatFactory: Promise<FormatFactory>;
  chartTheme: PartialTheme;
  isDarkMode: boolean;
}): ExpressionRenderDefinition<PieProps> => ({
  name: 'lens_pie_renderer',
  displayName: i18n.translate('xpack.lens.pie.visualizationName', {
    defaultMessage: 'Pie',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (domNode: Element, config: PieProps, handlers: IInterpreterRenderHandlers) => {
    const executeTriggerActions = getExecuteTriggerActions();
    const formatFactory = await dependencies.formatFactory;
    ReactDOM.render(
      <MemoizedChart
        {...config}
        {...dependencies}
        formatFactory={formatFactory}
        executeTriggerActions={executeTriggerActions}
        isDarkMode={dependencies.isDarkMode}
      />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

const MemoizedChart = React.memo(PieComponent);

export function PieComponent(
  props: PieProps & {
    formatFactory: FormatFactory;
    chartTheme: Exclude<PartialTheme, undefined>;
    isDarkMode: boolean;
    executeTriggerActions: UiActionsStart['executeTriggerActions'];
  }
) {
  const [firstTable] = Object.values(props.data.tables);
  const formatters: Record<string, ReturnType<FormatFactory>> = {};

  const { chartTheme, isDarkMode, executeTriggerActions } = props;
  const { shape, hideLabels, slices, metric } = props.args;

  if (!hideLabels) {
    firstTable.columns.forEach(column => {
      formatters[column.id] = props.formatFactory(column.formatHint);
    });
  }

  const fillLabel: Partial<PartitionFillLabel> = {
    textInvertible: true,
    valueFont: {
      fontWeight: 800,
    },
    valueFormatter: () => '',
  };

  // The datatable for pie charts should include subtotals, like this:
  // [bucket, subtotal, bucket, count]
  // But the user only configured [bucket, bucket, count]
  const columnGroups: Array<{
    col: KibanaDatatableColumn;
    metrics: KibanaDatatableColumn[];
  }> = [];
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
        return d + '';
      },
      fillLabel:
        shape === 'treemap' && layerIndex < columnGroups.length - 1
          ? {
              ...fillLabel,
              valueFormatter: () => '',
              textColor: 'rgba(0,0,0,0)',
            }
          : fillLabel,
      shape: {
        fillColor: d => {
          // Color is determined by the positional index of the top layer
          // This is done recursively until we reach the top layer
          let parentIndex = 0;
          let tempParent: typeof d | typeof d['parent'] = d;
          while (tempParent.parent && tempParent.depth > 0) {
            parentIndex = tempParent.sortIndex;
            tempParent = tempParent.parent;
          }

          // Look up round-robin color from default palette
          const outputColor =
            chartTheme.colors!.vizColors?.[parentIndex % chartTheme.colors!.vizColors.length] ||
            chartTheme.colors!.defaultVizColor!;

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
    outerSizeRatio: 1, // Use full height of embeddable
    specialFirstInnermostSector: false,
    minFontSize: 16,
    // Treemap can handle larger labels due to rectangular shape
    maxFontSize: shape === 'treemap' ? 36 : 24,
    // Labels are added outside the outer ring when the slice is too small
    linkLabel: {
      fontSize: 16,
      // Dashboard background color is affected by dark mode, which we need
      // to account for in outer labels
      textColor: isDarkMode ? 'white' : 'black',
    },
    sectorLineStroke: isDarkMode ? 'rgb(26, 27, 32)' : undefined,
  };
  if (shape !== 'treemap') {
    config.emptySizeRatio = shape === 'donut' ? 0.3 : 0;
  }
  if (hideLabels) {
    config.linkLabel = { maxCount: 0 };
  }
  const metricColumn = firstTable.columns.find(c => c.id === metric)!;
  const percentFormatter =
    metricColumn.formatHint && metricColumn.formatHint?.id === 'percent'
      ? formatters[metricColumn.id]
      : props.formatFactory({ id: 'percent' });

  const reverseGroups = columnGroups.reverse();

  const [state, setState] = useState({ isReady: false });
  // It takes a cycle for the chart to render. This prevents
  // reporting from printing a blank chart placeholder.
  useEffect(() => {
    setState({ isReady: true });
  }, []);

  const hasNegative = firstTable.rows.some(row => {
    const value = row[metricColumn.id];
    return typeof value === 'number' && value < 0;
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
    <VisualizationContainer className="lnsSunburstExpression__container" isReady={state.isReady}>
      <Chart>
        <Settings
          showLegend={!hideLabels && columnGroups.length > 1}
          legendMaxDepth={1 /* Color is based only on first layer */}
          onElementClick={args => {
            // This is a working around a bug in the chart library
            // see https://github.com/elastic/elastic-charts/issues/624
            const clickedLayers: LayerValue[] =
              shape === 'treemap'
                ? (args[args.length - 1][0] as LayerValue[])
                : (args[0][0] as LayerValue[]);

            const context: EmbeddableVisTriggerContext = {
              data: {
                data: (clickedLayers as LayerValue[]).reverse().map((clickedLayer, index) => {
                  const layerColumnId = columnGroups[index].col.id;
                  return {
                    row: firstTable.rows.findIndex(
                      row => row[layerColumnId] === clickedLayer.groupByRollup
                    ),
                    column: firstTable.columns.findIndex(col => col.id === layerColumnId),
                    value: clickedLayer.groupByRollup,
                    table: firstTable,
                  };
                }),
              },
            };

            executeTriggerActions(VIS_EVENT_TO_TRIGGER.filter, context);
          }}
        />
        <Partition
          id={shape}
          data={firstTable.rows}
          valueAccessor={(d: Datum) => {
            if (typeof d[metricColumn.id] === 'number') {
              return d[metricColumn.id];
            }
            // Sometimes there is missing data for outer slices
            // When there is missing data, we fall back to the next slices
            // This creates a sunburst effect
            const hasMetric = reverseGroups.find(
              group => group.metrics.length && d[group.metrics[0].id]
            );
            return hasMetric ? d[hasMetric.metrics[0].id] : Number.EPSILON;
          }}
          percentFormatter={(d: number) => percentFormatter.convert(d / 100)}
          valueGetter={hideLabels ? undefined : 'percent'}
          valueFormatter={(d: number) => (hideLabels ? '' : formatters[metricColumn.id].convert(d))}
          layers={layers}
          config={config}
        />
      </Chart>
    </VisualizationContainer>
  );
}
