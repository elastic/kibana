/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ThemeServiceStart } from '@kbn/core/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type { ExpressionTagcloudFunctionDefinition } from '@kbn/expression-tagcloud-plugin/common';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import {
  buildExpression,
  buildExpressionFunction,
  ExpressionFunctionTheme,
} from '@kbn/expressions-plugin/common';
import { PaletteRegistry } from '@kbn/coloring';
import { IconChartTagcloud } from '@kbn/chart-icons';
import { SystemPaletteExpressionFunctionDefinition } from '@kbn/charts-plugin/common';
import type { OperationMetadata, Visualization } from '../..';
import type { TagcloudState } from './types';
import { getSuggestions } from './suggestions';
import { TagcloudToolbar } from './tagcloud_toolbar';
import { TagsDimensionEditor } from './tags_dimension_editor';
import { DEFAULT_STATE, TAGCLOUD_LABEL } from './constants';

const TAG_GROUP_ID = 'tags';
const METRIC_GROUP_ID = 'metric';

export const getTagcloudVisualization = ({
  paletteService,
  theme,
}: {
  paletteService: PaletteRegistry;
  theme: ThemeServiceStart;
}): Visualization<TagcloudState> => ({
  id: 'lnsTagcloud',

  visualizationTypes: [
    {
      id: 'lnsTagcloud',
      icon: IconChartTagcloud,
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
    const newState = {
      ...state,
      ...DEFAULT_STATE,
    };
    delete newState.tagAccessor;
    delete newState.valueAccessor;
    delete newState.palette;
    return newState;
  },

  getLayerIds(state) {
    return [state.layerId];
  },

  getDescription() {
    return {
      icon: IconChartTagcloud,
      label: TAGCLOUD_LABEL,
    };
  },

  getSuggestions,

  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    return !suggestions.length
      ? undefined
      : {
          ...suggestions[0],
          visualizationState: {
            ...(suggestions[0].visualizationState as TagcloudState),
            ...(context.configuration as unknown as TagcloudState),
          },
        };
  },

  triggers: [VIS_EVENT_TO_TRIGGER.filter],

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: LayerTypes.DATA,
        ...DEFAULT_STATE,
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
          accessors: state.tagAccessor
            ? [
                {
                  columnId: state.tagAccessor,
                  triggerIconType: 'colorBy',
                  palette: paletteService
                    .get(state.palette?.name || 'default')
                    .getCategoricalColors(10, state.palette?.params),
                },
              ]
            : [],
          supportsMoreColumns: !state.tagAccessor,
          filterOperations: (op: OperationMetadata) => op.isBucketed,
          enableDimensionEditor: true,
          required: true,
          requiredMinDimensionCount: 1,
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
          requiredMinDimensionCount: 1,
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
        buildExpressionFunction<ExpressionTagcloudFunctionDefinition>('tagcloud', {
          bucket: state.tagAccessor,
          metric: state.valueAccessor,
          maxFontSize: state.maxFontSize,
          minFontSize: state.minFontSize,
          orientation: state.orientation,
          palette: buildExpression([
            state.palette
              ? buildExpressionFunction<ExpressionFunctionTheme>('theme', {
                  variable: 'palette',
                  default: [
                    paletteService.get(state.palette.name).toExpression(state.palette.params),
                  ],
                })
              : buildExpressionFunction<SystemPaletteExpressionFunctionDefinition>(
                  'system_palette',
                  {
                    name: 'default',
                  }
                ),
          ]).toAst(),
          showLabel: state.showLabel,
        }).toAst(),
      ],
    };
  },

  toPreviewExpression: (state, datasourceLayers, datasourceExpressionsByLayers = {}) => {
    if (!state.tagAccessor || !state.valueAccessor) {
      return null;
    }

    const datasourceExpression = datasourceExpressionsByLayers[state.layerId];
    return {
      type: 'expression',
      chain: [
        ...(datasourceExpression ? datasourceExpression.chain : []),
        buildExpressionFunction<ExpressionTagcloudFunctionDefinition>('tagcloud', {
          bucket: state.tagAccessor,
          isPreview: true,
          metric: state.valueAccessor,
          maxFontSize: 18,
          minFontSize: 4,
          orientation: state.orientation,
          palette: buildExpression([
            state.palette
              ? buildExpressionFunction<ExpressionFunctionTheme>('theme', {
                  variable: 'palette',
                  default: [
                    paletteService.get(state.palette.name).toExpression(state.palette.params),
                  ],
                })
              : buildExpressionFunction<SystemPaletteExpressionFunctionDefinition>(
                  'system_palette',
                  {
                    name: 'default',
                  }
                ),
          ]).toAst(),
          showLabel: false,
        }).toAst(),
      ],
    };
  },

  setDimension({ columnId, groupId, prevState }) {
    const update: Partial<TagcloudState> = {};
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

  DimensionEditorComponent(props) {
    if (props.groupId === TAG_GROUP_ID) {
      return (
        <TagsDimensionEditor
          paletteService={paletteService}
          state={props.state}
          setState={props.setState}
        />
      );
    }
    return null;
  },

  ToolbarComponent(props) {
    return <TagcloudToolbar {...props} />;
  },
});
