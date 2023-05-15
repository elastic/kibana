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
import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type { OperationMetadata, SuggestionRequest, Visualization } from '@kbn/lens-plugin/public';
import type { TagcloudState } from './types';
import { suggestions } from './suggestions';

const TAG_GROUP_ID = 'tags';
const METRIC_GROUP_ID = 'metric';

const TAGCLOUD_LABEL = i18n.translate('xpack.lens.tagcloud.label', {
  defaultMessage: 'Tag cloud',
});

export const getTagcloudVisualization = ({
  theme,
}: {
  theme: ThemeServiceStart;
}): Visualization<TagcloudState> => ({
  id: 'lnsTagcloud',

  visualizationTypes: [
    {
      id: 'lnsTagcloud',
      icon: null,
      label: TAGCLOUD_LABEL,
      groupLabel: i18n.translate('xpack.lens.pie.groupLabel', {
        defaultMessage: 'Proportion',
      }),
      showExperimentalBadge: true,
    },
  ],

  getVisualizationTypeId() {
    return 'lnsTagcloud';
  },

  clearLayer(state) {
    const newState = { ...state };
    delete newState.tagAccessor;
    delete newState.valueAccessor;
    delete newState.maxFontSize;
    delete newState.minFontSize;
    return newState;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: null,
      label: TAGCLOUD_LABEL,
    };
  },

  getSuggestions: suggestions,

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: LayerTypes.DATA,
        maxFontSize: 72,
        minFontSize: 18,
      }
    );
  },

  getConfiguration({ state }) {
    return {
      groups: [
        {
          groupId: TAG_GROUP_ID,
          groupLabel: i18n.translate('xpack.lens.tagcloud.tagLabel', {
            defaultMessage: 'Tags',
          }),
          layerId: state.layerId,
          accessors: state.tagAccessor ? [{ columnId: state.tagAccessor }] : [],
          supportsMoreColumns: !state.tagAccessor,
          filterOperations: (op: OperationMetadata) => op.isBucketed && op.dataType === 'string',
          enableDimensionEditor: true,
          required: true,
          dataTestSubj: 'lnsTagcloud_tagDimensionPanel',
        },
        {
          groupId: METRIC_GROUP_ID,
          groupLabel: i18n.translate('xpack.lens.tagcloud.metricValueLabel', {
            defaultMessage: 'Metric',
          }),
          isMetricDimension: true,
          layerId: state.layerId,
          accessors: state.valueAccessor ? [{ columnId: state.valueAccessor }] : [],
          supportsMoreColumns: !state.valueAccessor,
          filterOperations: (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number',
          enableDimensionEditor: true,
          required: true,
          dataTestSubj: 'lnsTagcloud_valueDimensionPanel',
        },
      ],
    };
  },

  getSupportedLayers() {
    return [
      {
        type: LayerTypes.DATA,
        label: i18n.translate('xpack.lens.tagcloud.addLayer', {
          defaultMessage: 'Add visualization layer',
        }),
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return LayerTypes.DATA;
    }
  },

  toExpression: (state, datasourceLayers, attributes, datasourceExpressionsByLayers = {}) => {
    if (!state.tagAccessor || !state.valueAccessor) {
      return null;
    }

    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];
    return {
      type: 'expression',
      chain: [
        ...(datasourceExpression ? datasourceExpression.chain : []),
        {
          type: 'function',
          function: 'tagcloud',
          arguments: {
            bucket: [state.tagAccessor],
            metric: [state.valueAccessor],
          },
        },
      ],
    };
  },

  toPreviewExpression: (state, datasourceLayers, datasourceExpressionsByLayers = {}) => {
    if (!state.tagAccessor || !state.valueAccessor) {
      return null;
    }

    // shrink font size to fit in preview window
    const PREVIEW_WINDOW_MAX_FONT_SIZE = 24;
    const fontSizeRatio = state.maxFontSize > PREVIEW_WINDOW_MAX_FONT_SIZE
      ? state.maxFontSize / PREVIEW_WINDOW_MAX_FONT_SIZE
      : 1;

    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];
    return {
      type: 'expression',
      chain: [
        ...(datasourceExpression ? datasourceExpression.chain : []),
        {
          type: 'function',
          function: 'tagcloud',
          arguments: {
            bucket: [state.tagAccessor],
            metric: [state.valueAccessor],
            maxFontSize: [Math.floor(state.maxFontSize / fontSizeRatio)],
            minFontSize: [Math.ceil(state.minFontSize / fontSizeRatio)],
            showLabel: [false],
            isPreview: [true],
          },
        },
      ],
    };
  },

  setDimension({ columnId, groupId, prevState }) {
    const update: Partial<ChoroplethChartState> = {};
    if (groupId === TAG_GROUP_ID) {
      update.tagAccessor = columnId;
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

    if (prevState.tagAccessor === columnId) {
      delete update.tagAccessor;
    } else if (prevState.valueAccessor === columnId) {
      delete update.valueAccessor;
    }

    return update;
  },

  renderDimensionEditor(domElement, props) {
    return null;
  },
});
