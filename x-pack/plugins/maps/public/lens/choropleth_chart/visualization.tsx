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
import { getSuggestions } from './suggestions';
import { layerTypes } from '../../../../lens/public';
import type { OperationMetadata, SuggestionRequest, Visualization } from '../../../../lens/public';
import type { ChoroplethChartState } from './types';
import { Icon } from './icon';
import { RegionKeyEditor } from './region_key_editor';

const REGION_KEY_GROUP_ID = 'region_key';
const METRIC_GROUP_ID = 'metric';

const CHART_LABEL = i18n.translate('xpack.maps.lens.choropleth.label', {
  defaultMessage: 'Region map',
});

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
      label: CHART_LABEL,
      groupLabel: i18n.translate('xpack.maps.lens.groupLabel', {
        defaultMessage: 'Map',
      }),
      sortPriority: 1,
      showExperimentalBadge: true,
    },
  ],

  getVisualizationTypeId() {
    return 'lnsChoropleth';
  },

  clearLayer(state) {
    const newState = { ...state };
    delete newState.emsLayerId;
    delete newState.emsField;
    delete newState.regionAccessor;
    delete newState.valueAccessor;
    return newState;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: Icon,
      label: CHART_LABEL,
    };
  },

  getSuggestions(suggestionRequest: SuggestionRequest<ChoroplethChartState>) {
    return getSuggestions(suggestionRequest, emsFileLayers);
  },

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
      }
    );
  },

  getConfiguration({ state }) {
    return {
      groups: [
        {
          groupId: REGION_KEY_GROUP_ID,
          groupLabel: i18n.translate('xpack.maps.lens.choroplethChart.regionKeyLabel', {
            defaultMessage: 'Region key',
          }),
          layerId: state.layerId,
          accessors: state.regionAccessor ? [{ columnId: state.regionAccessor }] : [],
          supportsMoreColumns: !state.regionAccessor,
          filterOperations: (op: OperationMetadata) => op.isBucketed && op.dataType === 'string',
          enableDimensionEditor: true,
          required: true,
          dataTestSubj: 'lnsChoropleth_regionKeyDimensionPanel',
        },
        {
          groupId: METRIC_GROUP_ID,
          groupLabel: i18n.translate('xpack.maps.lens.choroplethChart.metricValueLabel', {
            defaultMessage: 'Metric',
          }),
          layerId: state.layerId,
          accessors: state.valueAccessor ? [{ columnId: state.valueAccessor }] : [],
          supportsMoreColumns: !state.valueAccessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
          enableDimensionEditor: true,
          required: true,
          dataTestSubj: 'lnsChoropleth_valueDimensionPanel',
        },
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.maps.lens.choroplethChart.addLayer', {
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
    if (!state.regionAccessor || !state.valueAccessor) {
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
            layerId: [state.layerId],
            emsField: state.emsField ? [state.emsField] : [],
            emsLayerId: state.emsLayerId ? [state.emsLayerId] : [],
            regionAccessor: [state.regionAccessor],
            valueAccessor: [state.valueAccessor],
          },
        },
      ],
    };
  },

  toPreviewExpression: (state, datasourceLayers) => {
    return null;
  },

  setDimension({ columnId, groupId, prevState }) {
    const update: Partial<ChoroplethChartState> = {};
    if (groupId === REGION_KEY_GROUP_ID) {
      update.regionAccessor = columnId;
    } else if (groupId === METRIC_GROUP_ID) {
      update.valueAccessor = columnId;
    }
    return {
      ...prevState,
      ...update,
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const update = { ...prevState };

    if (prevState.regionAccessor === columnId) {
      delete update.regionAccessor;
      delete update.emsLayerId;
      delete update.emsField;
    } else if (prevState.valueAccessor === columnId) {
      delete update.valueAccessor;
    }

    return update;
  },

  renderDimensionEditor(domElement, props) {
    if (props.groupId === REGION_KEY_GROUP_ID) {
      render(
        <KibanaThemeProvider theme$={theme.theme$}>
          <I18nProvider>
            <RegionKeyEditor
              emsFileLayers={emsFileLayers}
              state={props.state}
              setState={props.setState}
            />
          </I18nProvider>
        </KibanaThemeProvider>,
        domElement
      );
    }
  },

  getErrorMessages(state) {
    return undefined;
  },
});
