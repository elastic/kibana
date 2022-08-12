/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { render } from 'react-dom';
import { Ast, AstFunction } from '@kbn/interpreter';
import { PaletteOutput, PaletteRegistry, CUSTOM_PALETTE, CustomPaletteParams } from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { LayoutDirection } from '@elastic/charts';
import { euiLightVars } from '@kbn/ui-theme';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import {
  EXPRESSION_METRIC_NAME,
  EXPRESSION_METRIC_TRENDLINE_NAME,
} from '@kbn/expression-metric-vis-plugin/public';
import { LayerType } from '../../../common';
import { getSuggestions } from './suggestions';
import { LensIconChartMetric } from '../../assets/chart_metric';
import {
  Visualization,
  OperationMetadata,
  DatasourceLayers,
  VisualizationConfigProps,
  VisualizationDimensionGroupConfig,
} from '../../types';
import { layerTypes } from '../../../common';
import { GROUP_ID, LENS_METRIC_ID } from './constants';
import { DimensionEditor } from './dimension_editor';
import { Toolbar } from './toolbar';
import { generateId } from '../../id_generator';
import { StaticHeader } from '../../shared_components';

export const DEFAULT_MAX_COLUMNS = 3;

export interface MetricVisualizationState {
  layerId: string;
  layerType: LayerType;
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  breakdownByAccessor?: string;
  // the dimensions can optionally be single numbers
  // computed by collapsing all rows
  collapseFn?: string;
  subtitle?: string;
  secondaryPrefix?: string;
  progressDirection?: LayoutDirection;
  color?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;

  trendlineLayerId?: string;
  trendlineLayerType?: LayerType;
  trendlineTimeAccessor?: string;
  trendlineMetricAccessor?: string;
  trendlineBreakdownByAccessor?: string;
}

export const supportedDataTypes = new Set(['number']);

// TODO - deduplicate with gauges?
function computePaletteParams(params: CustomPaletteParams) {
  return {
    ...params,
    // rewrite colors and stops as two distinct arguments
    colors: (params?.stops || []).map(({ color }) => color),
    stops: params?.name === 'custom' ? (params?.stops || []).map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

const getTrendlineExpression = (
  state: MetricVisualizationState,
  datasourceExpression?: Ast,
  collapseExpression?: AstFunction
): Ast | undefined => {
  if (!state.trendlineMetricAccessor || !state.trendlineTimeAccessor) {
    return;
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: EXPRESSION_METRIC_TRENDLINE_NAME,
        arguments: {
          metric: [state.trendlineMetricAccessor],
          timeField: [state.trendlineTimeAccessor],
          breakdownBy: state.trendlineBreakdownByAccessor
            ? [state.trendlineBreakdownByAccessor]
            : [],
          inspectorTableId: [state.trendlineLayerId],
          ...(datasourceExpression
            ? {
                table: [
                  {
                    ...datasourceExpression,
                    chain: [
                      ...datasourceExpression.chain,
                      ...(collapseExpression ? [collapseExpression] : []),
                    ],
                  },
                ],
              }
            : {}),
        },
      },
    ],
  };
};

const toExpression = (
  paletteService: PaletteRegistry,
  state: MetricVisualizationState,
  datasourceLayers: DatasourceLayers,
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
): Ast | null => {
  if (!state.metricAccessor) {
    return null;
  }

  const datasource = datasourceLayers[state.layerId];
  const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

  const maxPossibleTiles =
    // if there's a collapse function, no need to calculate since we're dealing with a single tile
    state.breakdownByAccessor && !state.collapseFn
      ? datasource.getMaxPossibleNumValues(state.breakdownByAccessor)
      : null;

  const getCollapseFnArguments = () => {
    const metric = [state.metricAccessor, state.secondaryMetricAccessor, state.maxAccessor].filter(
      Boolean
    );

    const fn = metric.map((accessor) => {
      if (accessor !== state.maxAccessor) {
        return state.collapseFn;
      } else {
        const isMaxStatic = Boolean(
          datasource.getOperationForColumnId(state.maxAccessor!)?.isStaticValue
        );
        // we do this because the user expects the static value they set to be the same
        // even if they define a collapse on the breakdown by
        return isMaxStatic ? 'max' : state.collapseFn;
      }
    });

    return {
      by: [],
      metric,
      fn,
    };
  };

  const collapseExpressionFunction = state.collapseFn
    ? ({
        type: 'function',
        function: 'lens_collapse',
        arguments: getCollapseFnArguments(),
      } as AstFunction)
    : undefined;

  const trendlineExpression = state.trendlineLayerId
    ? getTrendlineExpression(
        state,
        datasourceExpressionsByLayers[state.trendlineLayerId],
        collapseExpressionFunction
      )
    : undefined;

  return {
    type: 'expression',
    chain: [
      ...(datasourceExpression?.chain ?? []),
      ...(collapseExpressionFunction ? [collapseExpressionFunction] : []),
      {
        type: 'function',
        function: EXPRESSION_METRIC_NAME,
        arguments: {
          metric: state.metricAccessor ? [state.metricAccessor] : [],
          secondaryMetric: state.secondaryMetricAccessor ? [state.secondaryMetricAccessor] : [],
          secondaryPrefix: state.secondaryPrefix ? [state.secondaryPrefix] : [],
          max: state.maxAccessor ? [state.maxAccessor] : [],
          breakdownBy:
            state.breakdownByAccessor && !state.collapseFn ? [state.breakdownByAccessor] : [],
          trendline: trendlineExpression ? [trendlineExpression] : [],
          subtitle: state.subtitle ? [state.subtitle] : [],
          progressDirection: state.progressDirection ? [state.progressDirection] : [],
          color: state.color
            ? [state.color]
            : state.maxAccessor
            ? [euiLightVars.euiColorPrimary]
            : [],
          palette: state.palette?.params
            ? [
                paletteService
                  .get(CUSTOM_PALETTE)
                  .toExpression(computePaletteParams(state.palette.params as CustomPaletteParams)),
              ]
            : [],
          maxCols: [state.maxCols ?? DEFAULT_MAX_COLUMNS],
          minTiles: maxPossibleTiles ? [maxPossibleTiles] : [],
          inspectorTableId: [state.layerId],
        },
      },
    ],
  };
};

const getMetricLayerConfiguration = (
  props: VisualizationConfigProps<MetricVisualizationState>
): {
  groups: VisualizationDimensionGroupConfig[];
} => {
  const hasColoring = props.state.palette != null;
  const stops = props.state.palette?.params?.stops || [];
  const isSupportedMetric = (op: OperationMetadata) =>
    !op.isBucketed && supportedDataTypes.has(op.dataType);

  const isSupportedDynamicMetric = (op: OperationMetadata) =>
    !op.isBucketed && supportedDataTypes.has(op.dataType) && !op.isStaticValue;

  const isBucketed = (op: OperationMetadata) => op.isBucketed;
  return {
    groups: [
      {
        groupId: GROUP_ID.METRIC,
        groupLabel: i18n.translate('xpack.lens.primaryMetric.label', {
          defaultMessage: 'Primary metric',
        }),
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors: props.state.metricAccessor
          ? [
              {
                columnId: props.state.metricAccessor,
                triggerIcon: hasColoring ? 'colorBy' : undefined,
                palette: hasColoring ? stops.map(({ color }) => color) : undefined,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.metricAccessor,
        filterOperations: isSupportedDynamicMetric,
        enableDimensionEditor: true,
        supportFieldFormat: false,
        required: true,
      },
      {
        groupId: GROUP_ID.SECONDARY_METRIC,
        groupLabel: i18n.translate('xpack.lens.metric.secondaryMetric', {
          defaultMessage: 'Secondary metric',
        }),
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors: props.state.secondaryMetricAccessor
          ? [
              {
                columnId: props.state.secondaryMetricAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.secondaryMetricAccessor,
        filterOperations: isSupportedDynamicMetric,
        enableDimensionEditor: true,
        supportFieldFormat: false,
        required: false,
      },
      {
        groupId: GROUP_ID.MAX,
        groupLabel: i18n.translate('xpack.lens.metric.max', { defaultMessage: 'Maximum value' }),
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors: props.state.maxAccessor
          ? [
              {
                columnId: props.state.maxAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.maxAccessor,
        filterOperations: isSupportedMetric,
        enableDimensionEditor: true,
        supportFieldFormat: false,
        supportStaticValue: true,
        required: false,
        groupTooltip: i18n.translate('xpack.lens.metric.maxTooltip', {
          defaultMessage: 'If the maximum value is specified, the minimum value is fixed at zero.',
        }),
      },
      {
        groupId: GROUP_ID.BREAKDOWN_BY,
        groupLabel: i18n.translate('xpack.lens.metric.breakdownBy', {
          defaultMessage: 'Break down by',
        }),
        accessors: props.state.breakdownByAccessor
          ? [
              {
                columnId: props.state.breakdownByAccessor,
                triggerIcon: props.state.collapseFn ? ('aggregate' as const) : undefined,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.breakdownByAccessor,
        filterOperations: isBucketed,
        enableDimensionEditor: true,
        supportFieldFormat: false,
      },
    ],
  };
};

const getTrendlineLayerConfiguration = (
  props: VisualizationConfigProps<MetricVisualizationState>
): {
  groups: VisualizationDimensionGroupConfig[];
} => {
  return {
    groups: [
      {
        groupId: GROUP_ID.TREND_METRIC,
        groupLabel: i18n.translate('xpack.lens.primaryMetric.label', {
          defaultMessage: 'Primary metric',
        }),
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors: props.state.trendlineMetricAccessor
          ? [
              {
                columnId: props.state.trendlineMetricAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineMetricAccessor,
        filterOperations: () => true,
        enableDimensionEditor: true,
        supportFieldFormat: false,
        required: true,
        hideGrouping: true,
        nestingOrder: 2,
        hidden: true,
      },
      {
        groupId: GROUP_ID.TREND_TIME,
        groupLabel: i18n.translate('xpack.lens.metric.timeField', { defaultMessage: 'Time field' }),
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors: props.state.trendlineTimeAccessor
          ? [
              {
                columnId: props.state.trendlineTimeAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineTimeAccessor,
        filterOperations: (op) => op.isBucketed && op.dataType === 'date',
        enableDimensionEditor: true,
        required: true,
        groupTooltip: i18n.translate('xpack.lens.metric.timeFieldTooltip', {
          defaultMessage: 'This is the time axis for the trend line',
        }),
        hideGrouping: true,
        nestingOrder: 1,
      },
      {
        groupId: GROUP_ID.TREND_BREAKDOWN_BY,
        groupLabel: i18n.translate('xpack.lens.metric.breakdownBy', {
          defaultMessage: 'Break down by',
        }),
        paramEditorCustomProps: {
          headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
            defaultMessage: 'Value',
          }),
        },
        accessors: props.state.trendlineBreakdownByAccessor
          ? [
              {
                columnId: props.state.trendlineBreakdownByAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineBreakdownByAccessor,
        filterOperations: () => false,
        enableDimensionEditor: true,
        required: false,
        hideGrouping: true,
        nestingOrder: 0,
        hidden: true,
      },
    ],
  };
};

export const metricLabel = i18n.translate('xpack.lens.metric.label', {
  defaultMessage: 'Metric',
});
const metricGroupLabel = i18n.translate('xpack.lens.metric.groupLabel', {
  defaultMessage: 'Goal and single value',
});

export const getMetricVisualization = ({
  paletteService,
  theme,
}: {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
}): Visualization<MetricVisualizationState> => ({
  id: LENS_METRIC_ID,

  visualizationTypes: [
    {
      id: LENS_METRIC_ID,
      icon: LensIconChartMetric,
      label: metricLabel,
      groupLabel: metricGroupLabel,
      showExperimentalBadge: true,
      sortPriority: 3,
    },
  ],

  getVisualizationTypeId() {
    return LENS_METRIC_ID;
  },

  clearLayer(state) {
    const newState = { ...state };
    delete newState.metricAccessor;
    delete newState.secondaryMetricAccessor;
    delete newState.secondaryPrefix;
    delete newState.breakdownByAccessor;
    delete newState.collapseFn;
    delete newState.maxAccessor;
    delete newState.palette;
    // TODO - clear more?
    return newState;
  },

  // TODO - can we just hide by layer type in the supportedLayers array instead of by layer?
  // I.e. do we anticipate a scenario where some layers of the same type will be hidden while others be shown?
  getLayersInUse(state) {
    return [
      { id: state.layerId },
      ...(state.trendlineLayerId ? [{ id: state.trendlineLayerId, hidden: true }] : []),
    ];
  },

  getDescription() {
    return {
      icon: LensIconChartMetric,
      label: metricLabel,
    };
  },

  getSuggestions,

  initialize(addNewLayer, state, mainPalette) {
    return (
      state ?? {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
        palette: mainPalette,
      }
    );
  },
  triggers: [VIS_EVENT_TO_TRIGGER.filter],

  getConfiguration(props) {
    return props.layerId === props.state.layerId
      ? getMetricLayerConfiguration(props)
      : getTrendlineLayerConfiguration(props);
  },

  getSupportedLayers(state) {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.metric.addLayer', {
          defaultMessage: 'Visualization',
        }),
        initialDimensions: state
          ? [
              {
                groupId: 'max',
                columnId: generateId(),
                staticValue: 0,
              },
            ]
          : undefined,
        disabled: true,
        hideFromMenu: true,
      },
      {
        type: layerTypes.METRIC_TRENDLINE,
        label: i18n.translate('xpack.lens.metric.layerType.trendLine', {
          defaultMessage: 'Trendline',
        }),
        initialDimensions: [
          { groupId: GROUP_ID.TREND_TIME, columnId: generateId(), autoTimeField: true },
        ],
        disabled: Boolean(state?.trendlineLayerId),
        hideFromMenu: true,
      },
    ];
  },

  getLinkedLayers(state, newLayerId: string): string[] {
    return newLayerId === state.trendlineLayerId ? [state.layerId] : [];
  },

  getLinkedDimensions(state) {
    if (!state.trendlineLayerId || !state.metricAccessor) {
      return [];
    }

    const links: Array<{
      from: { columnId: string; groupId: string; layerId: string };
      to: {
        columnId?: string;
        groupId: string;
        layerId: string;
      };
    }> = [
      {
        from: {
          columnId: state.metricAccessor,
          groupId: GROUP_ID.METRIC,
          layerId: state.layerId,
        },
        to: {
          columnId: state.trendlineMetricAccessor,
          groupId: GROUP_ID.TREND_METRIC,
          layerId: state.trendlineLayerId,
        },
      },
    ];

    if (state.breakdownByAccessor) {
      links.push({
        from: {
          columnId: state.breakdownByAccessor,
          groupId: GROUP_ID.BREAKDOWN_BY,
          layerId: state.layerId,
        },
        to: {
          columnId: state.trendlineBreakdownByAccessor,
          groupId: GROUP_ID.TREND_BREAKDOWN_BY,
          layerId: state.trendlineLayerId,
        },
      });
    }

    return links;
  },

  appendLayer(state, layerId, layerType) {
    if (layerType !== layerTypes.METRIC_TRENDLINE) {
      throw new Error(`Metric vis only supports layers of type ${layerTypes.METRIC_TRENDLINE}!`);
    }

    return { ...state, trendlineLayerId: layerId, trendlineLayerType: layerType };
  },

  removeLayer(state) {
    return {
      ...state,
      trendlineLayerId: undefined,
      trendlineLayerType: undefined,
      trendlineMetricAccessor: undefined,
      trendlineTimeAccessor: undefined,
      trendlineBreakdownByAccessor: undefined,
    };
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }

    if (state?.trendlineLayerId === layerId) {
      return state.trendlineLayerType;
    }
  },

  toExpression: (state, datasourceLayers, attributes, datasourceExpressionsByLayers) =>
    toExpression(paletteService, state, datasourceLayers, datasourceExpressionsByLayers),

  setDimension({ prevState, columnId, groupId }) {
    const updated = { ...prevState };

    switch (groupId) {
      case GROUP_ID.METRIC:
        updated.metricAccessor = columnId;
        break;
      case GROUP_ID.SECONDARY_METRIC:
        updated.secondaryMetricAccessor = columnId;
        break;
      case GROUP_ID.MAX:
        updated.maxAccessor = columnId;
        break;
      case GROUP_ID.BREAKDOWN_BY:
        updated.breakdownByAccessor = columnId;
        break;
      case GROUP_ID.TREND_TIME:
        updated.trendlineTimeAccessor = columnId;
        break;
      case GROUP_ID.TREND_METRIC:
        updated.trendlineMetricAccessor = columnId;
        break;
      case GROUP_ID.TREND_BREAKDOWN_BY:
        updated.trendlineBreakdownByAccessor = columnId;
        break;
    }

    return updated;
  },

  removeDimension({ prevState, layerId, columnId }) {
    const updated = { ...prevState };

    if (prevState.metricAccessor === columnId) {
      delete updated.metricAccessor;
      delete updated.palette;
    }
    if (prevState.secondaryMetricAccessor === columnId) {
      delete updated.secondaryMetricAccessor;
      delete updated.secondaryPrefix;
    }
    if (prevState.maxAccessor === columnId) {
      delete updated.maxAccessor;
    }
    if (prevState.breakdownByAccessor === columnId) {
      delete updated.breakdownByAccessor;
      delete updated.collapseFn;
    }
    if (prevState.trendlineTimeAccessor === columnId) {
      delete updated.trendlineTimeAccessor;
    }
    if (prevState.trendlineMetricAccessor === columnId) {
      delete updated.trendlineMetricAccessor;
    }
    if (prevState.trendlineBreakdownByAccessor === columnId) {
      delete updated.trendlineBreakdownByAccessor;
    }

    return updated;
  },

  renderLayerHeader(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          {props.layerId === props.state.layerId ? (
            <StaticHeader icon={LensIconChartMetric} label={metricLabel} />
          ) : (
            <StaticHeader
              label={i18n.translate('xpack.lens.metric.trendlineLayerLabel', {
                defaultMessage: 'Trendline',
              })}
            />
          )}
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <Toolbar {...props} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <DimensionEditor {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getErrorMessages(state) {
    // Is it possible to break it?
    return undefined;
  },

  getDisplayOptions() {
    return {
      noPanelTitle: true,
      noPadding: true,
    };
  },
});
