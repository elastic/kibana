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
import { PaletteOutput, PaletteRegistry, CustomPaletteParams } from '@kbn/coloring';
import { ThemeServiceStart } from '@kbn/core/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { LayoutDirection } from '@elastic/charts';
import { euiLightVars, euiThemeVars } from '@kbn/ui-theme';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { IconChartMetric } from '@kbn/chart-icons';
import { CollapseFunction } from '../../../common/expressions';
import type { LayerType } from '../../../common';
import { layerTypes } from '../../../common/layer_types';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import { getSuggestions } from './suggestions';
import {
  Visualization,
  OperationMetadata,
  AccessorConfig,
  VisualizationConfigProps,
  VisualizationDimensionGroupConfig,
  Suggestion,
} from '../../types';
import { GROUP_ID, LENS_METRIC_ID } from './constants';
import { DimensionEditor, DimensionEditorAdditionalSection } from './dimension_editor';
import { Toolbar } from './toolbar';
import { generateId } from '../../id_generator';
import { FormatSelectorOptions } from '../../datasources/form_based/dimension_panel/format_selector';
import { toExpression } from './to_expression';

export const DEFAULT_MAX_COLUMNS = 3;

export const showingBar = (
  state: MetricVisualizationState
): state is MetricVisualizationState & { showBar: true; maxAccessor: string } =>
  Boolean(state.showBar && state.maxAccessor);

export const getDefaultColor = (state: MetricVisualizationState) =>
  showingBar(state) ? euiLightVars.euiColorPrimary : euiThemeVars.euiColorLightestShade;

export interface MetricVisualizationState {
  layerId: string;
  layerType: LayerType;
  metricAccessor?: string;
  secondaryMetricAccessor?: string;
  maxAccessor?: string;
  breakdownByAccessor?: string;
  // the dimensions can optionally be single numbers
  // computed by collapsing all rows
  collapseFn?: CollapseFunction;
  subtitle?: string;
  secondaryPrefix?: string;
  progressDirection?: LayoutDirection;
  showBar?: boolean;
  color?: string;
  palette?: PaletteOutput<CustomPaletteParams>;
  maxCols?: number;

  trendlineLayerId?: string;
  trendlineLayerType?: LayerType;
  trendlineTimeAccessor?: string;
  trendlineMetricAccessor?: string;
  trendlineSecondaryMetricAccessor?: string;
  trendlineBreakdownByAccessor?: string;
}

export const supportedDataTypes = new Set(['number']);

export const metricLabel = i18n.translate('xpack.lens.metric.label', {
  defaultMessage: 'Metric',
});
const metricGroupLabel = i18n.translate('xpack.lens.metric.groupLabel', {
  defaultMessage: 'Goal and single value',
});

const getMetricLayerConfiguration = (
  props: VisualizationConfigProps<MetricVisualizationState>
): {
  groups: VisualizationDimensionGroupConfig[];
} => {
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
          triggerIconType: 'colorBy',
          palette: stops.map(({ color }) => color),
        }
      : hasStaticColoring
      ? {
          triggerIconType: 'color',
          color: props.state.color,
        }
      : {
          triggerIconType: 'color',
          color: getDefaultColor(props.state),
        };
  };

  const isBucketed = (op: OperationMetadata) => op.isBucketed;

  const formatterOptions: FormatSelectorOptions = {
    disableExtraOptions: true,
  };

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
        isMetricDimension: true,
        enableDimensionEditor: true,
        enableFormatSelector: true,
        formatSelectorOptions: formatterOptions,
        requiredMinDimensionCount: 1,
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
        accessors: props.state.secondaryMetricAccessor
          ? [
              {
                columnId: props.state.secondaryMetricAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.secondaryMetricAccessor,
        filterOperations: isSupportedDynamicMetric,
        isMetricDimension: true,
        enableDimensionEditor: true,
        enableFormatSelector: true,
        formatSelectorOptions: formatterOptions,
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
        enableFormatSelector: false,
        formatSelectorOptions: formatterOptions,
        supportStaticValue: true,
        prioritizedOperation: 'max',
        groupTooltip: i18n.translate('xpack.lens.metric.maxTooltip', {
          defaultMessage: 'If the maximum value is specified, the minimum value is fixed at zero.',
        }),
      },
      {
        groupId: GROUP_ID.BREAKDOWN_BY,
        dataTestSubj: 'lnsMetric_breakdownByDimensionPanel',
        groupLabel: i18n.translate('xpack.lens.metric.breakdownBy', {
          defaultMessage: 'Break down by',
        }),
        accessors: props.state.breakdownByAccessor
          ? [
              {
                columnId: props.state.breakdownByAccessor,
                triggerIconType: props.state.collapseFn ? ('aggregate' as const) : undefined,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.breakdownByAccessor,
        filterOperations: isBucketed,
        enableDimensionEditor: true,
        enableFormatSelector: true,
        formatSelectorOptions: formatterOptions,
      },
    ],
  };
};

const getTrendlineLayerConfiguration = (
  props: VisualizationConfigProps<MetricVisualizationState>
): {
  hidden: boolean;
  groups: VisualizationDimensionGroupConfig[];
} => {
  return {
    hidden: true,
    groups: [
      {
        groupId: GROUP_ID.TREND_METRIC,
        groupLabel: i18n.translate('xpack.lens.primaryMetric.label', {
          defaultMessage: 'Primary metric',
        }),
        accessors: props.state.trendlineMetricAccessor
          ? [
              {
                columnId: props.state.trendlineMetricAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineMetricAccessor,
        filterOperations: () => false,
        hideGrouping: true,
        nestingOrder: 3,
      },
      {
        groupId: GROUP_ID.TREND_SECONDARY_METRIC,
        groupLabel: i18n.translate('xpack.lens.metric.secondaryMetric', {
          defaultMessage: 'Secondary metric',
        }),
        accessors: props.state.trendlineSecondaryMetricAccessor
          ? [
              {
                columnId: props.state.trendlineSecondaryMetricAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineSecondaryMetricAccessor,
        filterOperations: () => false,
        hideGrouping: true,
        nestingOrder: 2,
      },
      {
        groupId: GROUP_ID.TREND_TIME,
        groupLabel: i18n.translate('xpack.lens.metric.timeField', { defaultMessage: 'Time field' }),
        accessors: props.state.trendlineTimeAccessor
          ? [
              {
                columnId: props.state.trendlineTimeAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineTimeAccessor,
        filterOperations: () => false,
        hideGrouping: true,
        nestingOrder: 1,
      },
      {
        groupId: GROUP_ID.TREND_BREAKDOWN_BY,
        groupLabel: i18n.translate('xpack.lens.metric.breakdownBy', {
          defaultMessage: 'Break down by',
        }),
        accessors: props.state.trendlineBreakdownByAccessor
          ? [
              {
                columnId: props.state.trendlineBreakdownByAccessor,
              },
            ]
          : [],
        supportsMoreColumns: !props.state.trendlineBreakdownByAccessor,
        filterOperations: () => false,
        hideGrouping: true,
        nestingOrder: 0,
      },
    ],
  };
};

const removeMetricDimension = (state: MetricVisualizationState) => {
  delete state.metricAccessor;
  delete state.palette;
  delete state.color;
};

const removeSecondaryMetricDimension = (state: MetricVisualizationState) => {
  delete state.secondaryMetricAccessor;
  delete state.secondaryPrefix;
};

const removeMaxDimension = (state: MetricVisualizationState) => {
  delete state.maxAccessor;
  delete state.progressDirection;
  delete state.showBar;
};

const removeBreakdownByDimension = (state: MetricVisualizationState) => {
  delete state.breakdownByAccessor;
  delete state.collapseFn;
  delete state.maxCols;
};

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
    delete newState.subtitle;

    removeMetricDimension(newState);
    removeSecondaryMetricDimension(newState);
    removeMaxDimension(newState);
    removeBreakdownByDimension(newState);

    return newState;
  },

  getLayerIds(state) {
    return state.trendlineLayerId ? [state.layerId, state.trendlineLayerId] : [state.layerId];
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
    return props.layerId === props.state.layerId
      ? getMetricLayerConfiguration(props)
      : getTrendlineLayerConfiguration(props);
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }

    if (state?.trendlineLayerId === layerId) {
      return state.trendlineLayerType;
    }
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
        canAddViaMenu: true,
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
        canAddViaMenu: true,
      },
    ];
  },

  appendLayer(state, layerId, layerType) {
    if (layerType !== layerTypes.METRIC_TRENDLINE) {
      throw new Error(`Metric vis only supports layers of type ${layerTypes.METRIC_TRENDLINE}!`);
    }

    return { ...state, trendlineLayerId: layerId, trendlineLayerType: layerType };
  },

  removeLayer(state, layerId) {
    const newState: MetricVisualizationState = {
      ...state,
      ...(state.layerId === layerId && { metricAccessor: undefined }),
      trendlineLayerId: undefined,
      trendlineLayerType: undefined,
      trendlineMetricAccessor: undefined,
      trendlineTimeAccessor: undefined,
      trendlineBreakdownByAccessor: undefined,
    };

    return newState;
  },

  getRemoveOperation(state, layerId) {
    return layerId === state.trendlineLayerId ? 'remove' : 'clear';
  },

  getLayersToLinkTo(state, newLayerId: string): string[] {
    return newLayerId === state.trendlineLayerId ? [state.layerId] : [];
  },

  getLinkedDimensions(state) {
    if (!state.trendlineLayerId) {
      return [];
    }

    const links: Array<{
      from: { columnId: string; groupId: string; layerId: string };
      to: {
        columnId?: string;
        groupId: string;
        layerId: string;
      };
    }> = [];

    if (state.metricAccessor) {
      links.push({
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
      });
    }

    if (state.secondaryMetricAccessor) {
      links.push({
        from: {
          columnId: state.secondaryMetricAccessor,
          groupId: GROUP_ID.SECONDARY_METRIC,
          layerId: state.layerId,
        },
        to: {
          columnId: state.trendlineSecondaryMetricAccessor,
          groupId: GROUP_ID.TREND_SECONDARY_METRIC,
          layerId: state.trendlineLayerId,
        },
      });
    }

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

  getLayersToRemoveOnIndexPatternChange: (state) => {
    return state.trendlineLayerId ? [state.trendlineLayerId] : [];
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
        if (!prevState.trendlineLayerId) {
          updated.showBar = true;
        }
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
      case GROUP_ID.TREND_SECONDARY_METRIC:
        updated.trendlineSecondaryMetricAccessor = columnId;
        break;
      case GROUP_ID.TREND_BREAKDOWN_BY:
        updated.trendlineBreakdownByAccessor = columnId;
        break;
    }

    return updated;
  },

  removeDimension({ prevState, columnId }) {
    const updated = { ...prevState };

    if (prevState.metricAccessor === columnId) {
      removeMetricDimension(updated);
    }
    if (prevState.secondaryMetricAccessor === columnId) {
      removeSecondaryMetricDimension(updated);
    }
    if (prevState.maxAccessor === columnId) {
      removeMaxDimension(updated);
    }
    if (prevState.breakdownByAccessor === columnId) {
      removeBreakdownByDimension(updated);
    }

    if (prevState.trendlineTimeAccessor === columnId) {
      delete updated.trendlineTimeAccessor;
    }
    if (prevState.trendlineMetricAccessor === columnId) {
      delete updated.trendlineMetricAccessor;
    }
    if (prevState.trendlineSecondaryMetricAccessor === columnId) {
      delete updated.trendlineSecondaryMetricAccessor;
    }
    if (prevState.trendlineBreakdownByAccessor === columnId) {
      delete updated.trendlineBreakdownByAccessor;
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

  renderDimensionEditorAdditionalSection(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <DimensionEditorAdditionalSection {...props} />
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

  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<
      Suggestion<MetricVisualizationState, FormBasedPersistedState>
    >;
    const suggestion: Suggestion<MetricVisualizationState, FormBasedPersistedState> = {
      ...allSuggestions[0],
      datasourceState: {
        ...allSuggestions[0].datasourceState,
        layers: allSuggestions.reduce(
          (acc, s) => ({
            ...acc,
            ...s.datasourceState?.layers,
          }),
          {}
        ),
      },
      visualizationState: {
        ...allSuggestions[0].visualizationState,
        ...context.configuration,
      },
    };
    return suggestion;
  },

  getVisualizationInfo(state: MetricVisualizationState) {
    const dimensions = [];
    if (state.metricAccessor) {
      dimensions.push({
        id: state.metricAccessor,
        name: i18n.translate('xpack.lens.primaryMetric.label', {
          defaultMessage: 'Primary metric',
        }),
        dimensionType: 'primary_metric',
      });
    }

    if (state.secondaryMetricAccessor) {
      dimensions.push({
        id: state.secondaryMetricAccessor,
        name: i18n.translate('xpack.lens.metric.secondaryMetric', {
          defaultMessage: 'Secondary metric',
        }),
        dimensionType: 'secondary_metric',
      });
    }

    if (state.maxAccessor) {
      dimensions.push({
        id: state.maxAccessor,
        name: i18n.translate('xpack.lens.metric.max', { defaultMessage: 'Maximum value' }),
        dimensionType: 'max',
      });
    }

    if (state.breakdownByAccessor) {
      dimensions.push({
        id: state.breakdownByAccessor,
        name: i18n.translate('xpack.lens.metric.breakdownBy', {
          defaultMessage: 'Break down by',
        }),
        dimensionType: 'breakdown',
      });
    }

    return {
      layers: [
        {
          layerId: state.layerId,
          layerType: state.layerType,
          chartType: 'metric',
          ...this.getDescription(state),
          dimensions,
        },
      ],
    };
  },
});
