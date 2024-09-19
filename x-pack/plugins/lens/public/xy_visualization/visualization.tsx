/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { groupBy, uniq } from 'lodash';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { getSuggestions } from './xy_suggestions';
import { XyToolbar, DimensionEditor } from './xy_config_panel';
import { LayerHeader } from './xy_config_panel/layer_header';
import type { Visualization, OperationMetadata, VisualizationType, AccessorConfig } from '../types';
import { State, visualizationTypes } from './types';
import { SeriesType, XYLayerConfig } from '../../common/expressions';
import { LayerType, layerTypes } from '../../common';
import { isHorizontalChart } from './state_helpers';
import { toExpression, toPreviewExpression, getSortedAccessors } from './to_expression';
import { LensIconChartBarStacked } from '../assets/chart_bar_stacked';
import { LensIconChartMixedXy } from '../assets/chart_mixed_xy';
import { LensIconChartBarHorizontal } from '../assets/chart_bar_horizontal';
import { getAccessorColorConfig, getColorAssignments } from './color_assignment';
import { getColumnToLabelMap } from './state_helpers';
import { LensIconChartBarThreshold } from '../assets/chart_bar_threshold';
import { generateId } from '../id_generator';
import {
  getGroupsAvailableInData,
  getGroupsRelatedToData,
  getGroupsToShow,
  getStaticValue,
} from './threshold_helpers';
import {
  checkScaleOperation,
  checkXAccessorCompatibility,
  getAxisName,
} from './visualization_helpers';

const defaultIcon = LensIconChartBarStacked;
const defaultSeriesType = 'bar_stacked';
const isNumericMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';
const isBucketed = (op: OperationMetadata) => op.isBucketed;

function getVisualizationType(state: State): VisualizationType | 'mixed' {
  if (!state.layers.length) {
    return (
      visualizationTypes.find((t) => t.id === state.preferredSeriesType) ?? visualizationTypes[0]
    );
  }
  const visualizationType = visualizationTypes.find((t) => t.id === state.layers[0].seriesType);
  const seriesTypes = uniq(state.layers.map((l) => l.seriesType));

  return visualizationType && seriesTypes.length === 1 ? visualizationType : 'mixed';
}

function getDescription(state?: State) {
  if (!state) {
    return {
      icon: defaultIcon,
      label: i18n.translate('xpack.lens.xyVisualization.xyLabel', {
        defaultMessage: 'XY',
      }),
    };
  }

  const visualizationType = getVisualizationType(state);

  if (visualizationType === 'mixed' && isHorizontalChart(state.layers)) {
    return {
      icon: LensIconChartBarHorizontal,
      label: i18n.translate('xpack.lens.xyVisualization.mixedBarHorizontalLabel', {
        defaultMessage: 'Mixed bar horizontal',
      }),
    };
  }

  if (visualizationType === 'mixed') {
    return {
      icon: LensIconChartMixedXy,
      label: i18n.translate('xpack.lens.xyVisualization.mixedLabel', {
        defaultMessage: 'Mixed XY',
      }),
    };
  }

  return {
    icon: visualizationType.icon,
    label: visualizationType.fullLabel || visualizationType.label,
  };
}

export const getXyVisualization = ({
  paletteService,
  fieldFormats,
}: {
  paletteService: PaletteRegistry;
  fieldFormats: FieldFormatsStart;
}): Visualization<State> => ({
  id: 'lnsXY',

  visualizationTypes,
  getVisualizationTypeId(state) {
    const type = getVisualizationType(state);
    return type === 'mixed' ? type : type.id;
  },

  getLayerIds(state) {
    return getLayersByType(state).map((l) => l.layerId);
  },

  getRemoveOperation(state, layerId) {
    const dataLayers = getLayersByType(state, layerTypes.DATA).map((l) => l.layerId);
    return dataLayers.includes(layerId) && dataLayers.length === 1 ? 'clear' : 'remove';
  },

  removeLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.filter((l) => l.layerId !== layerId),
    };
  },

  appendLayer(state, layerId, layerType) {
    const usedSeriesTypes = uniq(state.layers.map((layer) => layer.seriesType));
    return {
      ...state,
      layers: [
        ...state.layers,
        newLayerState(
          usedSeriesTypes.length === 1 ? usedSeriesTypes[0] : state.preferredSeriesType,
          layerId,
          layerType
        ),
      ],
    };
  },

  clearLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.map((l) =>
        l.layerId !== layerId ? l : newLayerState(state.preferredSeriesType, layerId)
      ),
    };
  },

  getDescription(state) {
    const { icon, label } = getDescription(state);

    return {
      icon: icon || defaultIcon,
      label,
    };
  },

  switchVisualizationType(seriesType: string, state: State) {
    return {
      ...state,
      preferredSeriesType: seriesType as SeriesType,
      layers: state.layers.map((layer) => ({ ...layer, seriesType: seriesType as SeriesType })),
    };
  },

  getSuggestions,

  initialize(addNewLayer, state) {
    return (
      state || {
        title: 'Empty XY chart',
        legend: { isVisible: true, position: Position.Right },
        valueLabels: 'hide',
        preferredSeriesType: defaultSeriesType,
        layers: [
          {
            layerId: addNewLayer(),
            accessors: [],
            position: Position.Top,
            seriesType: defaultSeriesType,
            showGridlines: false,
            layerType: layerTypes.DATA,
          },
        ],
      }
    );
  },

  getLayerType(layerId, state) {
    return state?.layers.find(({ layerId: id }) => id === layerId)?.layerType;
  },

  getSupportedLayers(state, frame) {
    const thresholdGroupIds = [
      {
        id: 'yThresholdLeft',
        label: 'yLeft' as const,
      },
      {
        id: 'yThresholdRight',
        label: 'yRight' as const,
      },
      {
        id: 'xThreshold',
        label: 'x' as const,
      },
    ];

    const dataLayers =
      state?.layers.filter(({ layerType = layerTypes.DATA }) => layerType === layerTypes.DATA) ||
      [];
    const filledDataLayers = dataLayers.filter(
      ({ accessors, xAccessor }) => accessors.length || xAccessor
    );
    const layerHasNumberHistogram = checkScaleOperation(
      'interval',
      'number',
      frame?.datasourceLayers || {}
    );
    const thresholdGroups = getGroupsRelatedToData(
      thresholdGroupIds,
      state,
      frame?.datasourceLayers || {},
      frame?.activeData
    );

    const layers = [
      {
        type: layerTypes.DATA,
        label: i18n.translate('xpack.lens.xyChart.addDataLayerLabel', {
          defaultMessage: 'Add visualization layer',
        }),
        icon: LensIconChartMixedXy,
      },
      {
        type: layerTypes.THRESHOLD,
        label: i18n.translate('xpack.lens.xyChart.addThresholdLayerLabel', {
          defaultMessage: 'Add threshold layer',
        }),
        icon: LensIconChartBarThreshold,
        disabled:
          !filledDataLayers.length ||
          (!dataLayers.some(layerHasNumberHistogram) &&
            dataLayers.every(({ accessors }) => !accessors.length)),
        tooltipContent: filledDataLayers.length
          ? undefined
          : i18n.translate('xpack.lens.xyChart.addThresholdLayerLabelDisabledHelp', {
              defaultMessage: 'Add some data to enable threshold layer',
            }),
        initialDimensions: state
          ? thresholdGroups.map(({ id, label }) => ({
              groupId: id,
              columnId: generateId(),
              dataType: 'number',
              label: getAxisName(label, { isHorizontal: isHorizontalChart(state?.layers || []) }),
              staticValue: getStaticValue(
                dataLayers,
                label,
                { activeData: frame?.activeData },
                layerHasNumberHistogram
              ),
            }))
          : undefined,
      },
    ];

    return layers;
  },

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [], supportStaticValue: true };
    }

    const datasource = frame.datasourceLayers[layer.layerId];

    const sortedAccessors: string[] = getSortedAccessors(datasource, layer);
    let mappedAccessors: AccessorConfig[] = sortedAccessors.map((accessor) => ({
      columnId: accessor,
    }));

    if (frame.activeData) {
      const colorAssignments = getColorAssignments(
        state.layers,
        { tables: frame.activeData },
        fieldFormats.deserialize
      );
      mappedAccessors = getAccessorColorConfig(
        colorAssignments,
        frame,
        {
          ...layer,
          accessors: sortedAccessors.filter((sorted) => layer.accessors.includes(sorted)),
        },
        paletteService
      );
    }

    const isHorizontal = isHorizontalChart(state.layers);
    const isDataLayer = !layer.layerType || layer.layerType === layerTypes.DATA;

    if (!isDataLayer) {
      const idToIndex = sortedAccessors.reduce<Record<string, number>>((memo, id, index) => {
        memo[id] = index;
        return memo;
      }, {});
      const { bottom, left, right } = groupBy(
        [...(layer.yConfig || [])].sort(
          ({ forAccessor: forA }, { forAccessor: forB }) => idToIndex[forA] - idToIndex[forB]
        ),
        ({ axisMode }) => {
          return axisMode;
        }
      );
      const groupsToShow = getGroupsToShow(
        [
          // When a threshold layer panel is added, a static threshold should automatically be included by default
          // in the first available axis, in the following order: vertical left, vertical right, horizontal.
          {
            config: left,
            id: 'yThresholdLeft',
            label: 'yLeft',
            dataTestSubj: 'lnsXY_yThresholdLeftPanel',
          },
          {
            config: right,
            id: 'yThresholdRight',
            label: 'yRight',
            dataTestSubj: 'lnsXY_yThresholdRightPanel',
          },
          {
            config: bottom,
            id: 'xThreshold',
            label: 'x',
            dataTestSubj: 'lnsXY_xThresholdPanel',
          },
        ],
        state,
        frame.datasourceLayers,
        frame?.activeData
      );
      return {
        supportFieldFormat: false,
        supportStaticValue: true,
        // Each thresholds layer panel will have sections for each available axis
        // (horizontal axis, vertical axis left, vertical axis right).
        // Only axes that support numeric thresholds should be shown
        groups: groupsToShow.map(({ config = [], id, label, dataTestSubj, valid }) => ({
          groupId: id,
          groupLabel: getAxisName(label, { isHorizontal }),
          accessors: config.map(({ forAccessor, color }) => ({
            columnId: forAccessor,
            color: color || mappedAccessors.find(({ columnId }) => columnId === forAccessor)?.color,
            triggerIcon: 'color',
          })),
          filterOperations: isNumericMetric,
          supportsMoreColumns: true,
          required: false,
          enableDimensionEditor: true,
          dataTestSubj,
          invalid: !valid,
          invalidMessage: i18n.translate('xpack.lens.configure.invalidThresholdDimension', {
            defaultMessage:
              'This threshold is assigned to an axis that no longer exists. You may move this threshold to another available axis or remove it.',
          }),
          requiresPreviousColumnOnDuplicate: true,
        })),
      };
    }

    return {
      groups: [
        {
          groupId: 'x',
          groupLabel: getAxisName('x', { isHorizontal }),
          accessors: layer.xAccessor ? [{ columnId: layer.xAccessor }] : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !layer.xAccessor,
          dataTestSubj: 'lnsXY_xDimensionPanel',
        },
        {
          groupId: 'y',
          groupLabel: getAxisName('y', { isHorizontal }),
          accessors: mappedAccessors,
          filterOperations: isNumericMetric,
          supportsMoreColumns: true,
          required: true,
          dataTestSubj: 'lnsXY_yDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          groupId: 'breakdown',
          groupLabel: i18n.translate('xpack.lens.xyChart.splitSeries', {
            defaultMessage: 'Break down by',
          }),
          accessors: layer.splitAccessor
            ? [
                {
                  columnId: layer.splitAccessor,
                  triggerIcon: 'colorBy',
                  palette: paletteService
                    .get(layer.palette?.name || 'default')
                    .getCategoricalColors(10, layer.palette?.params),
                },
              ]
            : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !layer.splitAccessor,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          required: layer.seriesType.includes('percentage'),
          enableDimensionEditor: true,
        },
      ],
    };
  },

  getMainPalette: (state) => {
    if (!state || state.layers.length === 0) return;
    return state.layers[0].palette;
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
    const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!foundLayer) {
      return prevState;
    }
    const newLayer = { ...foundLayer };
    if (groupId === 'x') {
      newLayer.xAccessor = columnId;
    }
    if (groupId === 'y') {
      newLayer.accessors = [...newLayer.accessors.filter((a) => a !== columnId), columnId];
    }
    if (groupId === 'breakdown') {
      newLayer.splitAccessor = columnId;
    }

    if (newLayer.layerType === layerTypes.THRESHOLD) {
      newLayer.accessors = [...newLayer.accessors.filter((a) => a !== columnId), columnId];
      const hasYConfig = newLayer.yConfig?.some(({ forAccessor }) => forAccessor === columnId);
      const previousYConfig = previousColumn
        ? newLayer.yConfig?.find(({ forAccessor }) => forAccessor === previousColumn)
        : false;
      if (!hasYConfig) {
        newLayer.yConfig = [
          ...(newLayer.yConfig || []),
          {
            // override with previous styling,
            ...previousYConfig,
            // but keep the new group & id config
            forAccessor: columnId,
            axisMode:
              groupId === 'xThreshold'
                ? 'bottom'
                : groupId === 'yThresholdRight'
                ? 'right'
                : 'left',
          },
        ];
      }
    }

    return {
      ...prevState,
      layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
    };
  },

  removeDimension({ prevState, layerId, columnId, frame }) {
    const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!foundLayer) {
      return prevState;
    }
    const newLayer = { ...foundLayer };
    if (newLayer.xAccessor === columnId) {
      delete newLayer.xAccessor;
    } else if (newLayer.splitAccessor === columnId) {
      delete newLayer.splitAccessor;
      // as the palette is associated with the break down by dimension, remove it together with the dimension
      delete newLayer.palette;
    } else if (newLayer.accessors.includes(columnId)) {
      newLayer.accessors = newLayer.accessors.filter((a) => a !== columnId);
    }

    if (newLayer.yConfig) {
      newLayer.yConfig = newLayer.yConfig.filter(({ forAccessor }) => forAccessor !== columnId);
    }

    let newLayers = prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l));
    // // check if there's any threshold layer and pull it off if all data layers have no dimensions set
    const layersByType = groupBy(newLayers, ({ layerType }) => layerType);
    // // check for data layers if they all still have xAccessors
    const groupsAvailable = getGroupsAvailableInData(
      layersByType[layerTypes.DATA],
      frame.datasourceLayers,
      frame?.activeData
    );
    if (
      (Object.keys(groupsAvailable) as Array<'x' | 'yLeft' | 'yRight'>).every(
        (id) => !groupsAvailable[id]
      )
    ) {
      newLayers = newLayers.filter(
        ({ layerType, accessors }) => layerType === layerTypes.DATA || accessors.length
      );
    }

    return {
      ...prevState,
      layers: newLayers,
    };
  },

  renderLayerHeader(domElement, props) {
    render(
      <I18nProvider>
        <LayerHeader {...props} />
      </I18nProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <I18nProvider>
        <XyToolbar {...props} />
      </I18nProvider>,
      domElement
    );
  },

  renderDimensionEditor(domElement, props) {
    render(
      <I18nProvider>
        <DimensionEditor
          {...props}
          formatFactory={fieldFormats.deserialize}
          paletteService={paletteService}
        />
      </I18nProvider>,
      domElement
    );
  },

  toExpression: (state, layers, attributes) =>
    toExpression(state, layers, paletteService, attributes),
  toPreviewExpression: (state, layers) => toPreviewExpression(state, layers, paletteService),

  getErrorMessages(state, datasourceLayers) {
    // Data error handling below here
    const hasNoAccessors = ({ accessors }: XYLayerConfig) =>
      accessors == null || accessors.length === 0;
    const hasNoSplitAccessor = ({ splitAccessor, seriesType }: XYLayerConfig) =>
      seriesType.includes('percentage') && splitAccessor == null;

    const errors: Array<{
      shortMessage: string;
      longMessage: React.ReactNode;
    }> = [];

    // check if the layers in the state are compatible with this type of chart
    if (state && state.layers.length > 1) {
      // Order is important here: Y Axis is fundamental to exist to make it valid
      const checks: Array<[string, (layer: XYLayerConfig) => boolean]> = [
        ['Y', hasNoAccessors],
        ['Break down', hasNoSplitAccessor],
      ];

      // filter out those layers with no accessors at all
      const filteredLayers = state.layers.filter(
        ({ accessors, xAccessor, splitAccessor, layerType }: XYLayerConfig) =>
          layerType === layerTypes.DATA &&
          (accessors.length > 0 || xAccessor != null || splitAccessor != null)
      );
      for (const [dimension, criteria] of checks) {
        const result = validateLayersForDimension(dimension, filteredLayers, criteria);
        if (!result.valid) {
          errors.push(result.payload);
        }
      }
    }

    if (datasourceLayers && state) {
      // temporary fix for #87068
      errors.push(...checkXAccessorCompatibility(state, datasourceLayers));

      for (const layer of state.layers) {
        const datasourceAPI = datasourceLayers[layer.layerId];
        if (datasourceAPI) {
          for (const accessor of layer.accessors) {
            const operation = datasourceAPI.getOperationForColumnId(accessor);
            if (operation && operation.dataType !== 'number') {
              errors.push({
                shortMessage: i18n.translate('xpack.lens.xyVisualization.dataTypeFailureYShort', {
                  defaultMessage: `Wrong data type for {axis}.`,
                  values: {
                    axis: getAxisName('y', { isHorizontal: isHorizontalChart(state.layers) }),
                  },
                }),
                longMessage: i18n.translate('xpack.lens.xyVisualization.dataTypeFailureYLong', {
                  defaultMessage: `The dimension {label} provided for the {axis} has the wrong data type. Expected number but have {dataType}`,
                  values: {
                    label: operation.label,
                    dataType: operation.dataType,
                    axis: getAxisName('y', { isHorizontal: isHorizontalChart(state.layers) }),
                  },
                }),
              });
            }
          }
        }
      }
    }

    return errors.length ? errors : undefined;
  },

  getWarningMessages(state, frame) {
    if (state?.layers.length === 0 || !frame.activeData) {
      return;
    }

    const layers = state.layers;

    const filteredLayers = layers.filter(({ accessors }: XYLayerConfig) => accessors.length > 0);
    const accessorsWithArrayValues = [];
    for (const layer of filteredLayers) {
      const { layerId, accessors } = layer;
      const rows = frame.activeData[layerId] && frame.activeData[layerId].rows;
      if (!rows) {
        break;
      }
      const columnToLabel = getColumnToLabelMap(layer, frame.datasourceLayers[layerId]);
      for (const accessor of accessors) {
        const hasArrayValues = rows.some((row) => Array.isArray(row[accessor]));
        if (hasArrayValues) {
          accessorsWithArrayValues.push(columnToLabel[accessor]);
        }
      }
    }
    return accessorsWithArrayValues.map((label) => (
      <FormattedMessage
        key={label}
        id="xpack.lens.xyVisualization.arrayValues"
        defaultMessage="{label} contains array values. Your visualization may not render as
        expected."
        values={{
          label: <strong>{label}</strong>,
        }}
      />
    ));
  },
});

function validateLayersForDimension(
  dimension: string,
  layers: XYLayerConfig[],
  missingCriteria: (layer: XYLayerConfig) => boolean
):
  | { valid: true }
  | {
      valid: false;
      payload: { shortMessage: string; longMessage: React.ReactNode };
    } {
  // Multiple layers must be consistent:
  // * either a dimension is missing in ALL of them
  // * or should not miss on any
  if (layers.every(missingCriteria) || !layers.some(missingCriteria)) {
    return { valid: true };
  }
  // otherwise it's an error and it has to be reported
  const layerMissingAccessors = layers.reduce((missing: number[], layer, i) => {
    if (missingCriteria(layer)) {
      missing.push(i);
    }
    return missing;
  }, []);

  return {
    valid: false,
    payload: getMessageIdsForDimension(dimension, layerMissingAccessors, isHorizontalChart(layers)),
  };
}

// i18n ids cannot be dynamically generated, hence the function below
function getMessageIdsForDimension(dimension: string, layers: number[], isHorizontal: boolean) {
  const layersList = layers.map((i: number) => i + 1).join(', ');
  switch (dimension) {
    case 'Break down':
      return {
        shortMessage: i18n.translate('xpack.lens.xyVisualization.dataFailureSplitShort', {
          defaultMessage: `Missing {axis}.`,
          values: { axis: 'Break down by axis' },
        }),
        longMessage: i18n.translate('xpack.lens.xyVisualization.dataFailureSplitLong', {
          defaultMessage: `{layers, plural, one {Layer} other {Layers}} {layersList} {layers, plural, one {requires} other {require}} a field for the {axis}.`,
          values: { layers: layers.length, layersList, axis: 'Break down by axis' },
        }),
      };
    case 'Y':
      return {
        shortMessage: i18n.translate('xpack.lens.xyVisualization.dataFailureYShort', {
          defaultMessage: `Missing {axis}.`,
          values: { axis: getAxisName('y', { isHorizontal }) },
        }),
        longMessage: i18n.translate('xpack.lens.xyVisualization.dataFailureYLong', {
          defaultMessage: `{layers, plural, one {Layer} other {Layers}} {layersList} {layers, plural, one {requires} other {require}} a field for the {axis}.`,
          values: { layers: layers.length, layersList, axis: getAxisName('y', { isHorizontal }) },
        }),
      };
  }
  return { shortMessage: '', longMessage: '' };
}

function newLayerState(
  seriesType: SeriesType,
  layerId: string,
  layerType: LayerType = layerTypes.DATA
): XYLayerConfig {
  return {
    layerId,
    seriesType,
    accessors: [],
    layerType,
  };
}

function getLayersByType(state: State, byType?: string) {
  return state.layers.filter(({ layerType = layerTypes.DATA }) =>
    byType ? layerType === byType : true
  );
}
