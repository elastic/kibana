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
import { Ast } from '@kbn/interpreter';
import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { ColorMode } from '../../../../../src/plugins/charts/common';
import { PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { getSuggestions } from './metric_suggestions';
import { LensIconChartMetric } from '../assets/chart_metric';
import { Visualization, OperationMetadata, DatasourcePublicAPI } from '../types';
import type { MetricConfig, MetricState } from '../../common/expressions';
import { layerTypes } from '../../common';
import { CUSTOM_PALETTE, shiftPalette } from '../shared_components';
import { MetricDimensionEditor } from './dimension_editor';
import { MetricToolbar } from './metric_config_panel';

export const supportedTypes = new Set(['string', 'boolean', 'number', 'ip', 'date']);

const toExpression = (
  paletteService: PaletteRegistry,
  state: MetricState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  attributes?: Partial<Omit<MetricConfig, keyof MetricState>>
): Ast | null => {
  if (!state.accessor) {
    return null;
  }

  const [datasource] = Object.values(datasourceLayers);
  const operation = datasource && datasource.getOperationForColumnId(state.accessor);

  const stops = state.palette?.params?.stops || [];
  const isCustomPalette = state.palette?.params?.name === CUSTOM_PALETTE;

  const canColor = operation?.dataType === 'number';

  const paletteParams = {
    ...state.palette?.params,
    colors: stops.map(({ color }) => color),
    stops:
      isCustomPalette || state.palette?.params?.rangeMax == null
        ? stops.map(({ stop }) => stop)
        : shiftPalette(
            stops,
            Math.max(state.palette?.params?.rangeMax, ...stops.map(({ stop }) => stop))
          ).map(({ stop }) => stop),
    reverse: false,
  };

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_metric_chart',
        arguments: {
          title: [attributes?.title || ''],
          size: [state?.size || 'xl'],
          titlePosition: [state?.titlePosition || 'bottom'],
          textAlign: [state?.textAlign || 'center'],
          description: [attributes?.description || ''],
          metricTitle: [operation?.label || ''],
          accessor: [state.accessor],
          mode: [attributes?.mode || 'full'],
          colorMode: !canColor ? [ColorMode.None] : [state?.colorMode || ColorMode.None],
          palette:
            state?.colorMode && state?.colorMode !== ColorMode.None
              ? [paletteService.get(CUSTOM_PALETTE).toExpression(paletteParams)]
              : [],
        },
      },
    ],
  };
};
export const getMetricVisualization = ({
  paletteService,
  theme,
}: {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
}): Visualization<MetricState> => ({
  id: 'lnsMetric',

  visualizationTypes: [
    {
      id: 'lnsMetric',
      icon: LensIconChartMetric,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
      groupLabel: i18n.translate('xpack.lens.metric.groupLabel', {
        defaultMessage: 'Goal and single value',
      }),
      sortPriority: 3,
    },
  ],

  getVisualizationTypeId() {
    return 'lnsMetric';
  },

  clearLayer(state) {
    return {
      ...state,
      accessor: undefined,
    };
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: LensIconChartMetric,
      label: i18n.translate('xpack.lens.metric.label', {
        defaultMessage: 'Metric',
      }),
    };
  },

  getSuggestions,

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        accessor: undefined,
        layerType: layerTypes.DATA,
      }
    );
  },

  getConfiguration(props) {
    const hasColoring = props.state.palette != null;
    const stops = props.state.palette?.params?.stops || [];
    return {
      groups: [
        {
          groupId: 'metric',
          groupLabel: i18n.translate('xpack.lens.metric.label', { defaultMessage: 'Metric' }),
          layerId: props.state.layerId,
          accessors: props.state.accessor
            ? [
                {
                  columnId: props.state.accessor,
                  triggerIcon: hasColoring ? 'colorBy' : undefined,
                  palette: hasColoring ? stops.map(({ color }) => color) : undefined,
                },
              ]
            : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) =>
            !op.isBucketed && supportedTypes.has(op.dataType),
          enableDimensionEditor: true,
          required: true,
        },
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.metric.addLayer', {
          defaultMessage: 'Visualization',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
  },

  toExpression: (state, datasourceLayers, attributes) =>
    toExpression(paletteService, state, datasourceLayers, { ...attributes }),
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(paletteService, state, datasourceLayers, { mode: 'reduced' }),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined, colorMode: ColorMode.None, palette: undefined };
  },

  renderToolbar(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <MetricToolbar state={props.state} setState={props.setState} frame={props.frame} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <MetricDimensionEditor {...props} paletteService={paletteService} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getErrorMessages(state) {
    // Is it possible to break it?
    return undefined;
  },
});
