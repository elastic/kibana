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
import { euiLightVars, euiThemeVars } from '@kbn/ui-theme';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { IconChartMetric } from '@kbn/chart-icons';
import { LayerType } from '../../../common';
import { getSuggestions } from './suggestions';
import { Visualization, OperationMetadata, DatasourceLayers, AccessorConfig } from '../../types';
import { layerTypes } from '../../../common';
import { GROUP_ID, LENS_METRIC_ID } from './constants';
import { DimensionEditor } from './dimension_editor';
import { Toolbar } from './toolbar';
import { generateId } from '../../id_generator';

export const DEFAULT_MAX_COLUMNS = 3;

export const getDefaultColor = (hasMax: boolean) =>
  hasMax ? euiLightVars.euiColorPrimary : euiThemeVars.euiColorLightestShade;

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
      ? datasource?.getMaxPossibleNumValues(state.breakdownByAccessor)
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
          datasource?.getOperationForColumnId(state.maxAccessor!)?.isStaticValue
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

  return {
    type: 'expression',
    chain: [
      ...(datasourceExpression?.chain ?? []),
      ...(state.collapseFn
        ? [
            {
              type: 'function',
              function: 'lens_collapse',
              arguments: getCollapseFnArguments(),
            } as AstFunction,
          ]
        : []),
      {
        type: 'function',
        function: 'metricVis', // TODO import from plugin
        arguments: {
          metric: state.metricAccessor ? [state.metricAccessor] : [],
          secondaryMetric: state.secondaryMetricAccessor ? [state.secondaryMetricAccessor] : [],
          secondaryPrefix: state.secondaryPrefix ? [state.secondaryPrefix] : [],
          max: state.maxAccessor ? [state.maxAccessor] : [],
          breakdownBy:
            state.breakdownByAccessor && !state.collapseFn ? [state.breakdownByAccessor] : [],
          subtitle: state.subtitle ? [state.subtitle] : [],
          progressDirection: state.progressDirection ? [state.progressDirection] : [],
          color: [state.color || getDefaultColor(!!state.maxAccessor)],
          palette: state.palette?.params
            ? [
                paletteService
                  .get(CUSTOM_PALETTE)
                  .toExpression(computePaletteParams(state.palette.params as CustomPaletteParams)),
              ]
            : [],
          maxCols: [state.maxCols ?? DEFAULT_MAX_COLUMNS],
          minTiles: maxPossibleTiles ? [maxPossibleTiles] : [],
        },
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
      icon: IconChartMetric,
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

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: IconChartMetric,
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
    const isSupportedMetric = (op: OperationMetadata) =>
      !op.isBucketed && supportedDataTypes.has(op.dataType);

    const isSupportedDynamicMetric = (op: OperationMetadata) =>
      !op.isBucketed && supportedDataTypes.has(op.dataType) && !op.isStaticValue;

    const getPrimaryAccessorDisplayConfig = (): Partial<AccessorConfig> => {
      const stops = props.state.palette?.params?.stops || [];
      const hasStaticColoring = !!props.state.color;
      const hasDynamicColoring = !!props.state.palette;
      return hasDynamicColoring
        ? {
            triggerIcon: 'colorBy',
            palette: stops.map(({ color }) => color),
          }
        : hasStaticColoring
        ? {
            triggerIcon: 'color',
            color: props.state.color,
          }
        : {
            triggerIcon: 'color',
            color: getDefaultColor(!!props.state.maxAccessor),
          };
    };

    const isBucketed = (op: OperationMetadata) => op.isBucketed;

    return {
      groups: [
        {
          groupId: GROUP_ID.METRIC,
          dataTestSubj: 'lnsMetric_primaryMetricDimensionPanel',
          groupLabel: i18n.translate('xpack.lens.primaryMetric.label', {
            defaultMessage: 'Primary metric',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          layerId: props.state.layerId,
          accessors: props.state.metricAccessor
            ? [
                {
                  columnId: props.state.metricAccessor,
                  ...getPrimaryAccessorDisplayConfig(),
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
          dataTestSubj: 'lnsMetric_secondaryMetricDimensionPanel',
          groupLabel: i18n.translate('xpack.lens.metric.secondaryMetric', {
            defaultMessage: 'Secondary metric',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          layerId: props.state.layerId,
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
          dataTestSubj: 'lnsMetric_maxDimensionPanel',
          groupLabel: i18n.translate('xpack.lens.metric.max', { defaultMessage: 'Maximum value' }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.primaryMetric.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          layerId: props.state.layerId,
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
            defaultMessage:
              'If the maximum value is specified, the minimum value is fixed at zero.',
          }),
        },
        {
          groupId: GROUP_ID.BREAKDOWN_BY,
          dataTestSubj: 'lnsMetric_breakdownByDimensionPanel',
          groupLabel: i18n.translate('xpack.lens.metric.breakdownBy', {
            defaultMessage: 'Break down by',
          }),
          layerId: props.state.layerId,
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
          required: false,
        },
      ],
    };
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
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
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
    }

    return updated;
  },

  removeDimension({ prevState, columnId }) {
    const updated = { ...prevState };

    if (prevState.metricAccessor === columnId) {
      delete updated.metricAccessor;
      delete updated.palette;
      delete updated.color;
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

    return updated;
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
