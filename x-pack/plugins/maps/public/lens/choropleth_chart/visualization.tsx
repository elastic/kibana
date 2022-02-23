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
import { Ast } from '@kbn/interpreter/common';
import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { ColorMode } from '../../../../../src/plugins/charts/common';
import { PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { getSuggestions } from './suggestions';
import { Visualization, OperationMetadata, DatasourcePublicAPI } from '../types';
import type { ChoroplethChartState } from './types';
import type { LayerType } from '../../../../lens/common';
import { Icon } from './icon';

const toExpression = (
  paletteService: PaletteRegistry,
  state: ChoroplethChartState,
  datasourceLayers: Record<string, DatasourcePublicAPI>,
  attributes?: { title?: string, description?: string, isPreview: boolean },
): Ast | null => {
  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: 'lens_choropleth_chart',
        arguments: {
          title: [attributes?.title || ''],
          description: [attributes?.description || ''],
          isPreview: [attributes.isPreview],
          layerId: [state.layerId],
          emsField: [state.emsField],
          emsLayerId: [state.emsLayerId],
          bucketColumnId: [state.bucketColumnId],
          metricColumnId: [state.metricColumnId],
        },
      },
    ],
  };
};

export const getVisualization = ({
  paletteService,
  theme,
  emsAutoSuggest,
}: {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
  emsFileLayers: FileLayer[];
}): Visualization<ChoroplethChartState> => ({
  id: 'lnsChoropleth',

  visualizationTypes: [
    {
      id: 'lnsChoropleth',
      icon: Icon,
      label: i18n.translate('xpack.maps.lens.choropleth.label', {
        defaultMessage: 'Choropleth',
      }),
      groupLabel: i18n.translate('xpack.maps.lens.groupLabel', {
        defaultMessage: 'Map',
      }),
      sortPriority: 3,
    },
  ],

  getVisualizationTypeId() {
    return 'lnsChoropleth';
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
      icon: RegionmapChartIcon,
      label: i18n.translate('xpack.maps.metric.label', {
        defaultMessage: 'Regionmap',
      }),
    };
  },

  getSuggestions(suggestionRequest: SuggestionRequest<ChoroplethChartState>) {
    return getSuggestions(suggestionRequest, emsFileLayers);
  },

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
    return {
      groups: [
        {
          groupId: 'choropleth',
          groupLabel: i18n.translate('xpack.lens.metric.label', { defaultMessage: 'Metric' }),
          layerId: props.state.layerId,
          accessors: props.state.accessor
            ? [
                {
                  columnId: props.state.accessor,
                  triggerIcon: undefined,
                  palette: undefined,
                },
              ]
            : [],
          supportsMoreColumns: !props.state.accessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
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
          defaultMessage: 'Add visualization layer',
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
    toExpression(paletteService, state, datasourceLayers, { title: attributes.title, description: attributes.description, isPreview: false }),
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(paletteService, state, datasourceLayers, { isPreview: true }),

  setDimension({ prevState, columnId }) {
    return { ...prevState, accessor: columnId };
  },

  removeDimension({ prevState }) {
    return { ...prevState, accessor: undefined, colorMode: ColorMode.None, palette: undefined };
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <div>dimension editor</div>
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