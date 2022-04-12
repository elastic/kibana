/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import { euiThemeVars } from '@kbn/ui-theme';
import { render } from 'react-dom';
import { Ast } from '@kbn/interpreter';
import { PaletteOutput, PaletteRegistry, CUSTOM_PALETTE, shiftPalette } from '@kbn/coloring';
import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { ColorMode, CustomPaletteState } from '../../../../../src/plugins/charts/common';
import { getSuggestions } from './metric_suggestions';
import { LensIconChartMetric } from '../assets/chart_metric';
import { Visualization, OperationMetadata, DatasourcePublicAPI } from '../types';
import type { MetricState } from '../../common/types';
import { layerTypes } from '../../common';
import { MetricDimensionEditor } from './dimension_editor';
import { MetricToolbar } from './metric_config_panel';
import { DEFAULT_TITLE_POSITION } from './metric_config_panel/title_position_option';
import { DEFAULT_TITLE_SIZE } from './metric_config_panel/size_options';
import { DEFAULT_TEXT_ALIGNMENT } from './metric_config_panel/align_options';

interface MetricConfig extends Omit<MetricState, 'palette' | 'colorMode'> {
  title: string;
  description: string;
  metricTitle: string;
  mode: 'reduced' | 'full';
  colorMode: ColorMode;
  palette: PaletteOutput<CustomPaletteState>;
}

export const supportedTypes = new Set(['string', 'boolean', 'number', 'ip', 'date']);

const getFontSizeAndUnit = (fontSize: string) => {
  const [size, sizeUnit] = fontSize.split(/(\d+)/).filter(Boolean);
  return {
    size: Number(size),
    sizeUnit,
  };
};

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

  const fontSizes: Record<string, { size: number; sizeUnit: string }> = {
    xs: getFontSizeAndUnit(euiThemeVars.euiFontSizeXS),
    s: getFontSizeAndUnit(euiThemeVars.euiFontSizeS),
    m: getFontSizeAndUnit(euiThemeVars.euiFontSizeM),
    l: getFontSizeAndUnit(euiThemeVars.euiFontSizeL),
    xl: getFontSizeAndUnit(euiThemeVars.euiFontSizeXL),
    xxl: getFontSizeAndUnit(euiThemeVars.euiFontSizeXXL),
  };

  const labelFont = fontSizes[state?.size || DEFAULT_TITLE_SIZE];
  const labelToMetricFontSizeMap: Record<string, number> = {
    xs: fontSizes.xs.size * 2,
    s: fontSizes.m.size * 2.5,
    m: fontSizes.l.size * 2.5,
    l: fontSizes.xl.size * 2.5,
    xl: fontSizes.xxl.size * 2.5,
    xxl: fontSizes.xxl.size * 3,
  };
  const metricFontSize = labelToMetricFontSizeMap[state?.size || DEFAULT_TITLE_SIZE];

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'metricVis',
        arguments: {
          labelPosition: [state?.titlePosition || DEFAULT_TITLE_POSITION],
          font: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'font',
                  arguments: {
                    align: [state?.textAlign || DEFAULT_TEXT_ALIGNMENT],
                    size: [metricFontSize],
                    weight: ['600'],
                    lHeight: [metricFontSize * 1.5],
                    sizeUnit: [labelFont.sizeUnit],
                  },
                },
              ],
            },
          ],
          labelFont: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'font',
                  arguments: {
                    align: [state?.textAlign || DEFAULT_TEXT_ALIGNMENT],
                    size: [labelFont.size],
                    lHeight: [labelFont.size * 1.5],
                    sizeUnit: [labelFont.sizeUnit],
                  },
                },
              ],
            },
          ],
          metric: [
            {
              type: 'expression',
              chain: [
                {
                  type: 'function',
                  function: 'visdimension',
                  arguments: {
                    accessor: [state.accessor],
                  },
                },
              ],
            },
          ],
          showLabels: [!attributes?.mode || attributes?.mode === 'full'],
          colorMode: !canColor ? [ColorMode.None] : [state?.colorMode || ColorMode.None],
          autoScale: [true],
          colorFullBackground: [true],
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
