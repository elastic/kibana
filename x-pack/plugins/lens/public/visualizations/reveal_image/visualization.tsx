/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { ThemeServiceStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Ast } from '@kbn/interpreter';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import {
  Origin,
  ExpressionRevealImageFunctionDefinition,
} from '@kbn/expression-reveal-image-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { FilesClient } from '@kbn/files-plugin/public';
import { FileImageMetadata } from '@kbn/shared-ux-file-types';
import { FilesContext } from '@kbn/shared-ux-file-context';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import type { DatasourceLayers, OperationMetadata, Suggestion, Visualization } from '../../types';
import { getSuggestions } from './suggestions';
import { GROUP_ID, LENS_REVEAL_IMAGE_ID, RevealImageVisualizationState } from './constants';
import { getAccessorsFromState, getConfigurationAccessors, getMaxValue } from './utils';
import { generateId } from '../../id_generator';
import { RevealImageToolbar } from './toolbar_component';
export type { FileImageMetadata } from '@kbn/shared-ux-file-types';

export const revealImageIcon = 'image';
export const revealImageId = 'revealImage';

const groupLabelForRevealImage = i18n.translate('xpack.lens.metric.groupLabel', {
  defaultMessage: 'Goal and single value',
});

interface RevealImageVisualizationDeps {
  files: FilesClient<FileImageMetadata>;
  theme: ThemeServiceStart;
}

const isNumericMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';

const isNumericDynamicMetric = (op: OperationMetadata) => isNumericMetric(op) && !op.isStaticValue;

const CHART_NAMES = {
  revealImage: {
    icon: revealImageIcon,
    label: i18n.translate('xpack.lens.revealImage.revealImageLabel', {
      defaultMessage: 'Reveal image',
    }),
    groupLabel: groupLabelForRevealImage,
  },
};

const toExpression = (
  state: RevealImageVisualizationState,
  datasourceLayers: DatasourceLayers,
  attributes?: unknown,
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
): Ast | null => {
  const datasource = datasourceLayers[state.layerId];
  const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

  const originalOrder = datasource?.getTableSpec().map(({ columnId }) => columnId);
  if (!originalOrder || !state.metricAccessor) {
    return null;
  }

  const imageFn = buildExpression([
    buildExpressionFunction('getImage', {
      id: state.imageId,
    }),
  ]);
  const emptyImageFn = buildExpression([
    buildExpressionFunction('getImage', {
      id: state.emptyImageId,
    }),
  ]);

  const revealImageFn = buildExpressionFunction<ExpressionRevealImageFunctionDefinition>(
    'revealImage',
    {
      image: state.imageId ? imageFn : null,
      emptyImage: state.emptyImageId ? emptyImageFn : null,
      origin: state.origin ?? Origin.BOTTOM,
    }
  );

  const mathFn = buildExpressionFunction('math', {
    expression: `"${state.metricAccessor}"${
      state.maxAccessor ? `/"${state.maxAccessor || 10000}"` : ''
    }`,
  });

  return {
    type: 'expression',
    chain: [...(datasourceExpression?.chain ?? []), mathFn.toAst(), revealImageFn.toAst()],
  };
};

export const getRevealImageVisualization = ({
  theme,
  files,
}: RevealImageVisualizationDeps): Visualization<RevealImageVisualizationState> => ({
  id: LENS_REVEAL_IMAGE_ID,

  visualizationTypes: [
    {
      ...CHART_NAMES.revealImage,
      id: revealImageId,
      showExperimentalBadge: true,
    },
  ],
  getVisualizationTypeId(state) {
    return revealImageId;
  },
  getLayerIds(state) {
    return [state.layerId];
  },
  clearLayer(state) {
    const newState = { ...state };
    delete newState.metricAccessor;
    delete newState.maxAccessor;
    return newState;
  },

  getDescription(state) {
    return CHART_NAMES.revealImage;
  },

  initialize(addNewLayer, state) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: LayerTypes.DATA,
      }
    );
  },
  getSuggestions,

  getConfiguration({ state, frame }) {
    const row = state?.layerId ? frame?.activeData?.[state?.layerId]?.rows?.[0] : undefined;
    const { metricAccessor, accessors } = getConfigurationAccessors(state);

    return {
      groups: [
        {
          enableFormatSelector: true,
          layerId: state.layerId,
          groupId: GROUP_ID.METRIC,
          groupLabel: i18n.translate('xpack.lens.gauge.metricLabel', {
            defaultMessage: 'Metric',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.gauge.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          isMetricDimension: true,
          accessors: metricAccessor
            ? [
                {
                  columnId: metricAccessor,
                  triggerIconType: 'none',
                },
              ]
            : [],
          filterOperations: isNumericDynamicMetric,
          supportsMoreColumns: !metricAccessor,
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsRevealImage_metricDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          supportStaticValue: true,
          enableFormatSelector: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MAX,
          groupLabel: i18n.translate('xpack.lens.revealImage.maxValueLabel', {
            defaultMessage: 'Maximum value',
          }),
          paramEditorCustomProps: {
            labels: [
              i18n.translate('xpack.lens.revealImage.maxValueLabel', {
                defaultMessage: 'Maximum value',
              }),
            ],
            headingLabel: i18n.translate('xpack.lens.revealImage.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          isMetricDimension: true,
          accessors: state.maxAccessor ? [{ columnId: state.maxAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.maxAccessor,
          dataTestSubj: 'lnsRevealImage_maxDimensionPanel',
          prioritizedOperation: 'max',
          suggestedValue: () => (state.metricAccessor ? getMaxValue(row, accessors) : undefined),
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
    const update: Partial<RevealImageVisualizationState> = {};
    if (groupId === GROUP_ID.METRIC) {
      update.metricAccessor = columnId;
    }
    if (groupId === GROUP_ID.MAX) {
      update.maxAccessor = columnId;
    }
    return {
      ...prevState,
      ...update,
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const update = { ...prevState };

    if (prevState.metricAccessor === columnId) {
      delete update.metricAccessor;
    }

    if (prevState.maxAccessor === columnId) {
      delete update.maxAccessor;
    }

    return update;
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <div>RevealImageDimensionEditor</div>
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <KibanaThemeProvider theme$={theme.theme$}>
        <I18nProvider>
          <FilesContext client={files}>
            <RevealImageToolbar {...props} />
          </FilesContext>
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  getSupportedLayers(state, frame) {
    const row = state?.layerId ? frame?.activeData?.[state?.layerId]?.rows?.[0] : undefined;
    const accessors = getAccessorsFromState(state);
    const maxValue = getMaxValue(row, accessors);

    return [
      {
        type: LayerTypes.DATA,
        label: i18n.translate('xpack.lens.gauge.addLayer', {
          defaultMessage: 'Visualization',
        }),
        initialDimensions: state
          ? [
              {
                groupId: 'max',
                columnId: generateId(),
                staticValue: maxValue,
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

  toExpression: (state, datasourceLayers, attributes, datasourceExpressionsByLayers = {}) =>
    toExpression(state, datasourceLayers, { ...attributes }, datasourceExpressionsByLayers),

  toPreviewExpression: (state, datasourceLayers, datasourceExpressionsByLayers = {}) =>
    toExpression(state, datasourceLayers, undefined, datasourceExpressionsByLayers),

  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<
      Suggestion<RevealImageVisualizationState, FormBasedPersistedState>
    >;
    const suggestion: Suggestion<RevealImageVisualizationState, FormBasedPersistedState> = {
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
        ...(context.configuration as RevealImageVisualizationState),
      },
    };
    return suggestion;
  },

  getVisualizationInfo(state, frame) {
    const { accessors } = getConfigurationAccessors(state);
    const dimensions = [];
    if (accessors?.metric) {
      dimensions.push({
        id: accessors.metric,
        name: i18n.translate('xpack.lens.gauge.metricLabel', {
          defaultMessage: 'Metric',
        }),
        dimensionType: 'metric',
      });
    }

    if (accessors?.max) {
      dimensions.push({
        id: accessors.max,
        name: i18n.translate('xpack.lens.gauge.maxValueLabel', {
          defaultMessage: 'Maximum value',
        }),
        dimensionType: 'max',
      });
    }
    return {
      layers: [
        {
          layerId: state.layerId,
          layerType: state.layerType,
          chartType: revealImageId,
          ...this.getDescription(state),
          dimensions,
        },
      ],
    };
  },
});
