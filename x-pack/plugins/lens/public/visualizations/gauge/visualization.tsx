/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { Ast } from '@kbn/interpreter';
import { DatatableRow } from '@kbn/expressions-plugin';
import { PaletteRegistry, CustomPaletteParams, CUSTOM_PALETTE } from '@kbn/coloring';
import type { GaugeArguments } from '@kbn/expression-gauge-plugin/common';
import { GaugeShapes, EXPRESSION_GAUGE_NAME } from '@kbn/expression-gauge-plugin/common';
import {
  getGoalValue,
  getMaxValue,
  getMinValue,
  getValueFromAccessor,
  VerticalBulletIcon,
  HorizontalBulletIcon,
} from '@kbn/expression-gauge-plugin/public';
import type { DatasourceLayers, OperationMetadata, Visualization } from '../../types';
import { getSuggestions } from './suggestions';
import {
  GROUP_ID,
  LENS_GAUGE_ID,
  GaugeVisualizationState,
  GaugeExpressionState,
} from './constants';
import { GaugeToolbar } from './toolbar_component';
import { applyPaletteParams } from '../../shared_components';
import { GaugeDimensionEditor } from './dimension_editor';
import { layerTypes } from '../../../common';
import { generateId } from '../../id_generator';
import { getAccessorsFromState } from './utils';

const groupLabelForGauge = i18n.translate('xpack.lens.metric.groupLabel', {
  defaultMessage: 'Goal and single value',
});

interface GaugeVisualizationDeps {
  paletteService: PaletteRegistry;
}

export const isNumericMetric = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

export const isNumericDynamicMetric = (op: OperationMetadata) =>
  isNumericMetric(op) && !op.isStaticValue;

export const CHART_NAMES = {
  horizontalBullet: {
    icon: HorizontalBulletIcon,
    label: i18n.translate('xpack.lens.gaugeHorizontal.gaugeLabel', {
      defaultMessage: 'Gauge horizontal',
    }),
    groupLabel: groupLabelForGauge,
  },
  verticalBullet: {
    icon: VerticalBulletIcon,
    label: i18n.translate('xpack.lens.gaugeVertical.gaugeLabel', {
      defaultMessage: 'Gauge vertical',
    }),
    groupLabel: groupLabelForGauge,
  },
};

function computePaletteParams(params: CustomPaletteParams) {
  return {
    ...params,
    // rewrite colors and stops as two distinct arguments
    colors: (params?.stops || []).map(({ color }) => color),
    stops: params?.name === 'custom' ? (params?.stops || []).map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

const checkInvalidConfiguration = (row?: DatatableRow, state?: GaugeVisualizationState) => {
  if (!row || !state) {
    return;
  }
  const minAccessor = state?.minAccessor;
  const maxAccessor = state?.maxAccessor;
  const minValue = minAccessor ? getValueFromAccessor(minAccessor, row) : undefined;
  const maxValue = maxAccessor ? getValueFromAccessor(maxAccessor, row) : undefined;
  if (maxValue !== null && maxValue !== undefined && minValue != null && minValue !== undefined) {
    if (maxValue < minValue) {
      return {
        invalid: true,
        invalidMessage: i18n.translate(
          'xpack.lens.guageVisualization.chartCannotRenderMinGreaterMax',
          {
            defaultMessage: 'Minimum value may not be greater than maximum value',
          }
        ),
      };
    }
    if (maxValue === minValue) {
      return {
        invalid: true,
        invalidMessage: i18n.translate('xpack.lens.guageVisualization.chartCannotRenderEqual', {
          defaultMessage: 'Minimum and maximum values may not be equal',
        }),
      };
    }
  }
};

const toExpression = (
  paletteService: PaletteRegistry,
  state: GaugeVisualizationState,
  datasourceLayers: DatasourceLayers,
  attributes?: Partial<Omit<GaugeArguments, keyof GaugeExpressionState | 'ariaLabel'>>
): Ast | null => {
  const datasource = datasourceLayers[state.layerId];

  const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
  if (!originalOrder || !state.metricAccessor) {
    return null;
  }

  return {
    type: 'expression',
    chain: [
      {
        type: 'function',
        function: EXPRESSION_GAUGE_NAME,
        arguments: {
          metric: state.metricAccessor ? [state.metricAccessor] : [],
          min: state.minAccessor ? [state.minAccessor] : [],
          max: state.maxAccessor ? [state.maxAccessor] : [],
          goal: state.goalAccessor ? [state.goalAccessor] : [],
          shape: [state.shape ?? GaugeShapes.HORIZONTAL_BULLET],
          colorMode: [state?.colorMode ?? 'none'],
          palette: state.palette?.params
            ? [
                paletteService
                  .get(CUSTOM_PALETTE)
                  .toExpression(
                    computePaletteParams((state.palette?.params || {}) as CustomPaletteParams)
                  ),
              ]
            : [],
          ticksPosition: state.ticksPosition ? [state.ticksPosition] : ['auto'],
          labelMinor: state.labelMinor ? [state.labelMinor] : [],
          labelMajor: state.labelMajor ? [state.labelMajor] : [],
          labelMajorMode: state.labelMajorMode ? [state.labelMajorMode] : ['auto'],
        },
      },
    ],
  };
};

export const getGaugeVisualization = ({
  paletteService,
}: GaugeVisualizationDeps): Visualization<GaugeVisualizationState> => ({
  id: LENS_GAUGE_ID,

  visualizationTypes: [
    {
      ...CHART_NAMES.horizontalBullet,
      id: GaugeShapes.HORIZONTAL_BULLET,
      showExperimentalBadge: true,
    },
    {
      ...CHART_NAMES.verticalBullet,
      id: GaugeShapes.VERTICAL_BULLET,
      showExperimentalBadge: true,
    },
  ],
  getVisualizationTypeId(state) {
    return state.shape;
  },
  getLayerIds(state) {
    return [state.layerId];
  },
  clearLayer(state) {
    const newState = { ...state };
    delete newState.metricAccessor;
    delete newState.minAccessor;
    delete newState.maxAccessor;
    delete newState.goalAccessor;
    delete newState.palette;
    delete newState.colorMode;
    return newState;
  },

  getDescription(state) {
    if (state.shape === GaugeShapes.HORIZONTAL_BULLET) {
      return CHART_NAMES.horizontalBullet;
    }
    return CHART_NAMES.verticalBullet;
  },

  switchVisualizationType: (visualizationTypeId, state) => {
    return {
      ...state,
      shape:
        visualizationTypeId === GaugeShapes.HORIZONTAL_BULLET
          ? GaugeShapes.HORIZONTAL_BULLET
          : GaugeShapes.VERTICAL_BULLET,
    };
  },

  initialize(addNewLayer, state, mainPalette) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: layerTypes.DATA,
        shape: GaugeShapes.HORIZONTAL_BULLET,
        palette: mainPalette,
        ticksPosition: 'auto',
        labelMajorMode: 'auto',
      }
    );
  },
  getSuggestions,

  getConfiguration({ state, frame }) {
    const hasColoring = Boolean(state.colorMode !== 'none' && state.palette?.params?.stops);

    const row = state?.layerId ? frame?.activeData?.[state?.layerId]?.rows?.[0] : undefined;
    const { metricAccessor } = state ?? {};

    const accessors = getAccessorsFromState(state);

    let palette;
    if (!(row == null || metricAccessor == null || state?.palette == null || !hasColoring)) {
      const currentMinMax = {
        min: getMinValue(row, accessors),
        max: getMaxValue(row, accessors),
      };

      const displayStops = applyPaletteParams(paletteService, state?.palette, currentMinMax);
      palette = displayStops.map(({ color }) => color);
    }
    const invalidProps = checkInvalidConfiguration(row, state) || {};

    return {
      groups: [
        {
          supportFieldFormat: true,
          layerId: state.layerId,
          groupId: GROUP_ID.METRIC,
          groupLabel: i18n.translate('xpack.lens.gauge.metricLabel', {
            defaultMessage: 'Metric',
          }),
          accessors: metricAccessor
            ? [
                palette
                  ? {
                      columnId: metricAccessor,
                      triggerIcon: 'colorBy',
                      palette,
                    }
                  : {
                      columnId: metricAccessor,
                      triggerIcon: 'none',
                    },
              ]
            : [],
          filterOperations: isNumericDynamicMetric,
          supportsMoreColumns: !metricAccessor,
          required: true,
          dataTestSubj: 'lnsGauge_metricDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          supportStaticValue: true,
          supportFieldFormat: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MIN,
          groupLabel: i18n.translate('xpack.lens.gauge.minValueLabel', {
            defaultMessage: 'Minimum value',
          }),
          accessors: state.minAccessor ? [{ columnId: state.minAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.minAccessor,
          dataTestSubj: 'lnsGauge_minDimensionPanel',
          prioritizedOperation: 'min',
          suggestedValue: () => (state.metricAccessor ? getMinValue(row, accessors) : undefined),
          ...invalidProps,
        },
        {
          supportStaticValue: true,
          supportFieldFormat: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MAX,
          groupLabel: i18n.translate('xpack.lens.gauge.maxValueLabel', {
            defaultMessage: 'Maximum value',
          }),
          accessors: state.maxAccessor ? [{ columnId: state.maxAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.maxAccessor,
          dataTestSubj: 'lnsGauge_maxDimensionPanel',
          prioritizedOperation: 'max',
          suggestedValue: () => (state.metricAccessor ? getMaxValue(row, accessors) : undefined),
          ...invalidProps,
        },
        {
          supportStaticValue: true,
          supportFieldFormat: false,
          layerId: state.layerId,
          groupId: GROUP_ID.GOAL,
          groupLabel: i18n.translate('xpack.lens.gauge.goalValueLabel', {
            defaultMessage: 'Goal value',
          }),
          accessors: state.goalAccessor ? [{ columnId: state.goalAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.goalAccessor,
          required: false,
          dataTestSubj: 'lnsGauge_goalDimensionPanel',
        },
      ],
    };
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
    const update: Partial<GaugeVisualizationState> = {};
    if (groupId === GROUP_ID.MIN) {
      update.minAccessor = columnId;
    }
    if (groupId === GROUP_ID.MAX) {
      update.maxAccessor = columnId;
    }
    if (groupId === GROUP_ID.GOAL) {
      update.goalAccessor = columnId;
    }
    if (groupId === GROUP_ID.METRIC) {
      update.metricAccessor = columnId;
    }
    return {
      ...prevState,
      ...update,
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const update = { ...prevState };

    if (prevState.goalAccessor === columnId) {
      delete update.goalAccessor;
    }
    if (prevState.minAccessor === columnId) {
      delete update.minAccessor;
    }
    if (prevState.maxAccessor === columnId) {
      delete update.maxAccessor;
    }
    if (prevState.metricAccessor === columnId) {
      delete update.metricAccessor;
      delete update.palette;
      delete update.colorMode;
      update.ticksPosition = 'auto';
    }

    return update;
  },

  renderDimensionEditor(domElement, props) {
    render(
      <I18nProvider>
        <GaugeDimensionEditor {...props} paletteService={paletteService} />
      </I18nProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <I18nProvider>
        <GaugeToolbar {...props} />
      </I18nProvider>,
      domElement
    );
  },

  getSupportedLayers(state, frame) {
    const row = state?.layerId ? frame?.activeData?.[state?.layerId]?.rows?.[0] : undefined;
    const accessors = getAccessorsFromState(state);
    const minValue = getMinValue(row, accessors);
    const maxValue = getMaxValue(row, accessors);
    const goalValue = getGoalValue(row, accessors);

    return [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.gauge.addLayer', {
          defaultMessage: 'Visualization',
        }),
        initialDimensions: state
          ? [
              {
                groupId: 'min',
                columnId: generateId(),
                staticValue: minValue,
              },
              {
                groupId: 'max',
                columnId: generateId(),
                staticValue: maxValue,
              },
              {
                groupId: 'goal',
                columnId: generateId(),
                staticValue: goalValue,
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

  toExpression: (state, datasourceLayers, attributes) =>
    toExpression(paletteService, state, datasourceLayers, { ...attributes }),
  toPreviewExpression: (state, datasourceLayers) =>
    toExpression(paletteService, state, datasourceLayers),

  getErrorMessages(state) {
    // not possible to break it?
    return undefined;
  },

  getWarningMessages(state, frame) {
    const { maxAccessor, minAccessor, goalAccessor, metricAccessor } = state;
    if (!maxAccessor && !minAccessor && !goalAccessor && !metricAccessor) {
      // nothing configured yet
      return;
    }
    if (!metricAccessor) {
      return [];
    }

    const row = frame?.activeData?.[state.layerId]?.rows?.[0];
    if (!row || checkInvalidConfiguration(row, state)) {
      return [];
    }
    const metricValue = row[metricAccessor];
    const maxValue = maxAccessor && row[maxAccessor];
    const minValue = minAccessor && row[minAccessor];
    const goalValue = goalAccessor && row[goalAccessor];

    const warnings = [];
    if (typeof minValue === 'number') {
      if (minValue > metricValue) {
        warnings.push([
          <FormattedMessage
            id="xpack.lens.gaugeVisualization.minValueGreaterMetricShortMessage"
            defaultMessage="Minimum value is greater than metric value."
          />,
        ]);
      }
      if (minValue > goalValue) {
        warnings.push([
          <FormattedMessage
            id="xpack.lens.gaugeVisualization.minimumValueGreaterGoalShortMessage"
            defaultMessage="Minimum value is greater than goal value."
          />,
        ]);
      }
    }

    if (typeof maxValue === 'number') {
      if (metricValue > maxValue) {
        warnings.push([
          <FormattedMessage
            id="xpack.lens.gaugeVisualization.metricValueGreaterMaximumShortMessage"
            defaultMessage="Metric value is greater than maximum value."
          />,
        ]);
      }

      if (typeof goalValue === 'number' && goalValue > maxValue) {
        warnings.push([
          <FormattedMessage
            id="xpack.lens.gaugeVisualization.goalValueGreaterMaximumShortMessage"
            defaultMessage="Goal value is greater than maximum value."
          />,
        ]);
      }
    }

    return warnings;
  },
});
