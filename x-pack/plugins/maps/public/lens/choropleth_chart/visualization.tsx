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
import type { FileLayer } from '@elastic/ems-client';
import { ThemeServiceStart } from 'kibana/public';
import type { PaletteRegistry } from 'src/plugins/charts/public';
import { KibanaThemeProvider } from '../../../../../../src/plugins/kibana_react/public';
import { ColorMode } from '../../../../../../src/plugins/charts/common';
import { getSuggestions } from './suggestions';
import { layerTypes } from '../../../../lens/common';
import type { OperationMetadata, SuggestionRequest, Visualization } from '../../../../lens/public';
import type { ChoroplethChartState } from './types';
import { Icon } from './icon';

export const getVisualization = ({
  paletteService,
  theme,
  emsFileLayers,
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
      icon: Icon,
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
      return layerTypes.DATA;
    }
  },

  toExpression: (state, datasourceLayers, attributes) => {
    if (
      !state.accessor ||
      !state.emsField ||
      !state.emsLayerId ||
      !state.bucketColumnId ||
      !state.metricColumnId
    ) {
      return null;
    }

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_choropleth_chart',
          arguments: {
            title: [attributes?.title || ''],
            isPreview: [false],
            layerId: [state.layerId],
            emsField: [state.emsField],
            emsLayerId: [state.emsLayerId],
            bucketColumnId: [state.bucketColumnId],
            metricColumnId: [state.metricColumnId],
          },
        },
      ],
    };
  },

  toPreviewExpression: (state, datasourceLayers) => {
    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_choropleth_chart',
          arguments: {
            isPreview: [true],
          },
        },
      ],
    };
  },

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
