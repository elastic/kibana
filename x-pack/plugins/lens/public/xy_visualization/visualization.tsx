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
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { PaletteRegistry } from 'src/plugins/charts/public';
import { FieldFormatsStart } from 'src/plugins/field_formats/public';
import { ThemeServiceStart } from 'kibana/public';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../src/plugins/visualizations/public';
import { getSuggestions } from './xy_suggestions';
import { XyToolbar } from './xy_config_panel';
import { DimensionEditor } from './xy_config_panel/dimension_editor';
import { LayerHeader } from './xy_config_panel/layer_header';
import type { Visualization, AccessorConfig, FramePublicAPI } from '../types';
import { State, visualizationTypes, XYSuggestion } from './types';
import { SeriesType, XYLayerConfig, YAxisMode } from '../../common/expressions';
import { layerTypes } from '../../common';
import { isHorizontalChart } from './state_helpers';
import { toExpression, toPreviewExpression, getSortedAccessors } from './to_expression';
import { getAccessorColorConfig, getColorAssignments } from './color_assignment';
import { getColumnToLabelMap } from './state_helpers';
import {
  getGroupsAvailableInData,
  getReferenceConfiguration,
  getReferenceSupportedLayer,
  setReferenceDimension,
} from './reference_line_helpers';
import {
  checkXAccessorCompatibility,
  defaultSeriesType,
  getAxisName,
  getDescription,
  getLayersByType,
  getVisualizationType,
  isBucketed,
  isDataLayer,
  isNumericDynamicMetric,
  isReferenceLayer,
  newLayerState,
  supportedDataLayer,
  validateLayersForDimension,
} from './visualization_helpers';
import { groupAxesByType } from './axes_configuration';
import { XYState } from '..';

export const getXyVisualization = ({
  paletteService,
  fieldFormats,
  useLegacyTimeAxis,
  kibanaTheme,
}: {
  paletteService: PaletteRegistry;
  fieldFormats: FieldFormatsStart;
  useLegacyTimeAxis: boolean;
  kibanaTheme: ThemeServiceStart;
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

  getDescription,

  switchVisualizationType(seriesType: string, state: State) {
    return {
      ...state,
      preferredSeriesType: seriesType as SeriesType,
      layers: state.layers.map((layer) => ({ ...layer, seriesType: seriesType as SeriesType })),
    };
  },

  getSuggestions,

  triggers: [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],

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
    return [supportedDataLayer, getReferenceSupportedLayer(state, frame)];
  },

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    const sortedAccessors: string[] = getSortedAccessors(
      frame.datasourceLayers[layer.layerId],
      layer
    );
    const mappedAccessors = getMappedAccessors({
      state,
      frame,
      layer,
      fieldFormats,
      paletteService,
      accessors: sortedAccessors,
    });

    if (isReferenceLayer(layer)) {
      return getReferenceConfiguration({ state, frame, layer, sortedAccessors, mappedAccessors });
    }

    const isHorizontal = isHorizontalChart(state.layers);
    const { left, right } = groupAxesByType([layer], frame.activeData);
    // Check locally if it has one accessor OR one accessor per axis
    const layerHasOnlyOneAccessor = Boolean(
      layer.accessors.length < 2 ||
        (left.length && left.length < 2) ||
        (right.length && right.length < 2)
    );
    // Check also for multiple layers that can stack for percentage charts
    // Make sure that if multiple dimensions are defined for a single layer, they should belong to the same axis
    const hasOnlyOneAccessor =
      layerHasOnlyOneAccessor &&
      getLayersByType(state, layerTypes.DATA).filter(
        // check that the other layers are compatible with this one
        (dataLayer) => {
          if (
            dataLayer.seriesType === layer.seriesType &&
            Boolean(dataLayer.xAccessor) === Boolean(layer.xAccessor) &&
            Boolean(dataLayer.splitAccessor) === Boolean(layer.splitAccessor)
          ) {
            const { left: localLeft, right: localRight } = groupAxesByType(
              [dataLayer],
              frame.activeData
            );
            // return true only if matching axis are found
            return (
              dataLayer.accessors.length &&
              (Boolean(localLeft.length) === Boolean(left.length) ||
                Boolean(localRight.length) === Boolean(right.length))
            );
          }
          return false;
        }
      ).length < 2;

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
          filterOperations: isNumericDynamicMetric,
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
                  triggerIcon: 'colorBy' as const,
                  palette: paletteService
                    .get(layer.palette?.name || 'default')
                    .getCategoricalColors(10, layer.palette?.params),
                },
              ]
            : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !layer.splitAccessor,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          required: layer.seriesType.includes('percentage') && hasOnlyOneAccessor,
          enableDimensionEditor: true,
        },
      ],
    };
  },

  getMainPalette: (state) => {
    if (!state || state.layers.length === 0) return;
    return state.layers[0].palette;
  },

  setDimension(props) {
    const { prevState, layerId, columnId, groupId } = props;
    const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!foundLayer) {
      return prevState;
    }

    if (isReferenceLayer(foundLayer)) {
      return setReferenceDimension(props);
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
    return {
      ...prevState,
      layers: prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l)),
    };
  },

  updateLayersConfigurationFromContext({ prevState, layerId, context }) {
    const { chartType, axisPosition, palette, metrics } = context;
    const foundLayer = prevState?.layers.find((l) => l.layerId === layerId);
    if (!foundLayer) {
      return prevState;
    }
    const axisMode = axisPosition as YAxisMode;
    const yConfig = metrics.map((metric, idx) => {
      return {
        color: metric.color,
        forAccessor: metric.accessor ?? foundLayer.accessors[idx],
        ...(axisMode && { axisMode }),
      };
    });
    const newLayer = {
      ...foundLayer,
      ...(chartType && { seriesType: chartType as SeriesType }),
      ...(palette && { palette }),
      yConfig,
    };

    const newLayers = prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l));

    return {
      ...prevState,
      layers: newLayers,
    };
  },

  getVisualizationSuggestionFromContext({ suggestions, context }) {
    const visualizationStateLayers = [];
    let datasourceStateLayers = {};
    const fillOpacity = context.configuration.fill ? Number(context.configuration.fill) : undefined;
    for (let suggestionIdx = 0; suggestionIdx < suggestions.length; suggestionIdx++) {
      const currentSuggestion = suggestions[suggestionIdx] as XYSuggestion;
      const currentSuggestionsLayers = currentSuggestion.visualizationState.layers;
      const contextLayer = context.layers.find(
        (layer) => layer.layerId === Object.keys(currentSuggestion.datasourceState.layers)[0]
      );
      if (this.updateLayersConfigurationFromContext && contextLayer) {
        const updatedSuggestionState = this.updateLayersConfigurationFromContext({
          prevState: currentSuggestion.visualizationState as unknown as State,
          layerId: currentSuggestionsLayers[0].layerId as string,
          context: contextLayer,
        });

        visualizationStateLayers.push(...updatedSuggestionState.layers);
        datasourceStateLayers = {
          ...datasourceStateLayers,
          ...currentSuggestion.datasourceState.layers,
        };
      }
    }
    let suggestion = suggestions[0] as XYSuggestion;
    suggestion = {
      ...suggestion,
      datasourceState: {
        ...suggestion.datasourceState,
        layers: {
          ...suggestion.datasourceState.layers,
          ...datasourceStateLayers,
        },
      },
      visualizationState: {
        ...suggestion.visualizationState,
        fillOpacity,
        yRightExtent: context.configuration.extents?.yRightExtent,
        yLeftExtent: context.configuration.extents?.yLeftExtent,
        legend: context.configuration.legend,
        gridlinesVisibilitySettings: context.configuration.gridLinesVisibility,
        valuesInLegend: true,
        layers: visualizationStateLayers,
      },
    };
    return suggestion;
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
    // check if there's any reference layer and pull it off if all data layers have no dimensions set
    const layersByType = groupBy(newLayers, ({ layerType }) => layerType);
    // check for data layers if they all still have xAccessors
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
      newLayers = newLayers.filter((layer) => isDataLayer(layer) || layer.accessors.length);
    }

    return {
      ...prevState,
      layers: newLayers,
    };
  },

  renderLayerHeader(domElement, props) {
    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <LayerHeader {...props} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <XyToolbar {...props} useLegacyTimeAxis={useLegacyTimeAxis} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditor(domElement, props) {
    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <DimensionEditor
            {...props}
            formatFactory={fieldFormats.deserialize}
            paletteService={paletteService}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
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
          isDataLayer({ layerType }) &&
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
        defaultMessage="{label} contains array values. Your visualization may not render as expected."
        values={{
          label: <strong>{label}</strong>,
        }}
      />
    ));
  },
});

const getMappedAccessors = ({
  accessors,
  frame,
  fieldFormats,
  paletteService,
  state,
  layer,
}: {
  accessors: string[];
  frame: FramePublicAPI;
  paletteService: PaletteRegistry;
  fieldFormats: FieldFormatsStart;
  state: XYState;
  layer: XYLayerConfig;
}) => {
  let mappedAccessors: AccessorConfig[] = accessors.map((accessor) => ({
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
        accessors: accessors.filter((sorted) => layer.accessors.includes(sorted)),
      },
      paletteService
    );
  }
  return mappedAccessors;
};
