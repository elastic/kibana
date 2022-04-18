/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from 'react-dom';
import { Position } from '@elastic/charts';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { PaletteRegistry } from '@kbn/coloring';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { ThemeServiceStart } from '@kbn/core/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { FillStyle } from '@kbn/expression-xy-plugin/common';
import { getSuggestions } from './xy_suggestions';
import { XyToolbar } from './xy_config_panel';
import { DimensionEditor } from './xy_config_panel/dimension_editor';
import { LayerHeader } from './xy_config_panel/layer_header';
import type {
  Visualization,
  AccessorConfig,
  FramePublicAPI,
  VisualizationDimensionChangeProps,
  VisualizationConfigProps,
  VisualizationToolbarProps,
} from '../types';
import {
  State,
  visualizationTypes,
  XYSuggestion,
  XYLayerConfig,
  XYDataLayerConfig,
  YConfig,
  YAxisMode,
  SeriesType,
} from './types';
import { layerTypes } from '../../common';
import { isHorizontalChart } from './state_helpers';
import { toExpression, toPreviewExpression, getSortedAccessors } from './to_expression';
import { getAccessorColorConfig, getColorAssignments } from './color_assignment';
import { getColumnToLabelMap } from './state_helpers';
import {
  convertActiveDataFromIndexesToLayers,
  getGroupsAvailableInData,
  getReferenceConfiguration,
  getReferenceSupportedLayer,
  setReferenceDimension,
} from './reference_line_helpers';
import {
  getAnnotationsConfiguration,
  getAnnotationsSupportedLayer,
  setAnnotationsDimension,
  getUniqueLabels,
} from './annotations/helpers';
import {
  checkXAccessorCompatibility,
  defaultSeriesType,
  getAxisName,
  getDataLayers,
  getDescription,
  getFirstDataLayer,
  getLayersByType,
  getReferenceLayers,
  getVisualizationType,
  isAnnotationsLayer,
  isBucketed,
  isDataLayer,
  isNumericDynamicMetric,
  isReferenceLayer,
  newLayerState,
  supportedDataLayer,
  validateLayersForDimension,
} from './visualization_helpers';
import { groupAxesByType } from './axes_configuration';
import { XYState } from './types';
import { ReferenceLinePanel } from './xy_config_panel/reference_line_config_panel';
import { AnnotationsPanel } from './xy_config_panel/annotations_config_panel';
import { DimensionTrigger } from '../shared_components/dimension_trigger';
import { defaultAnnotationLabel } from './annotations/helpers';

type ConvertActiveDataFn = (
  activeData?: FramePublicAPI['activeData'],
  state?: State
) => FramePublicAPI['activeData'];

const updateFrame = (
  state: State | undefined,
  frame: Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>,
  convertActiveData?: ConvertActiveDataFn
) => {
  if (!frame) {
    return frame;
  }

  const activeData = convertActiveData?.(frame?.activeData, state) ?? frame?.activeData;
  return Object.assign(frame, { activeData });
};

const isVisualizationDimensionChangeProps = (
  props:
    | VisualizationConfigProps<State>
    | VisualizationDimensionChangeProps<State>
    | VisualizationToolbarProps<State>
): props is VisualizationDimensionChangeProps<State> => {
  if ((props as VisualizationDimensionChangeProps<State>).prevState) {
    return true;
  }
  return false;
};

function updateProps<
  T extends
    | VisualizationConfigProps<State>
    | VisualizationDimensionChangeProps<State>
    | VisualizationToolbarProps<State>
>(props: T, convertActiveData?: ConvertActiveDataFn) {
  const state = isVisualizationDimensionChangeProps(props) ? props.prevState : props.state;
  return { ...props, frame: updateFrame(state, props.frame), convertActiveData };
}

export const getXyVisualization = ({
  paletteService,
  fieldFormats,
  useLegacyTimeAxis,
  kibanaTheme,
  eventAnnotationService,
}: {
  paletteService: PaletteRegistry;
  eventAnnotationService: EventAnnotationServiceType;
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
    const firstUsedSeriesType = getDataLayers(state.layers)?.[0]?.seriesType;
    return {
      ...state,
      layers: [
        ...state.layers,
        newLayerState({
          seriesType: firstUsedSeriesType || state.preferredSeriesType,
          layerId,
          layerType,
        }),
      ],
    };
  },

  clearLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.map((l) =>
        l.layerId !== layerId
          ? l
          : newLayerState({ seriesType: state.preferredSeriesType, layerId })
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
    const newFrame = frame ? updateFrame(state, frame, this.convertActiveData) : frame;
    return [
      supportedDataLayer,
      getAnnotationsSupportedLayer(state, newFrame),
      getReferenceSupportedLayer(state, newFrame),
    ];
  },

  getConfiguration({ state, frame, layerId }) {
    const newFrame = updateFrame(state, frame, this.convertActiveData);
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    if (isAnnotationsLayer(layer)) {
      return getAnnotationsConfiguration({ state, frame: newFrame, layer });
    }

    const sortedAccessors: string[] = getSortedAccessors(
      newFrame.datasourceLayers[layer.layerId],
      layer
    );
    if (isReferenceLayer(layer)) {
      return getReferenceConfiguration({ state, frame: newFrame, layer, sortedAccessors });
    }

    const mappedAccessors = getMappedAccessors({
      state,
      frame: newFrame,
      layer,
      fieldFormats,
      paletteService,
      accessors: sortedAccessors,
    });

    if (isReferenceLayer(layer)) {
      return getReferenceConfiguration({ state, frame: newFrame, layer, sortedAccessors });
    }

    const dataLayer: XYDataLayerConfig = layer;

    const dataLayers = getDataLayers(state.layers);
    const isHorizontal = isHorizontalChart(state.layers);
    const { left, right } = groupAxesByType([layer], newFrame.activeData);
    // Check locally if it has one accessor OR one accessor per axis
    const layerHasOnlyOneAccessor = Boolean(
      dataLayer.accessors.length < 2 ||
        (left.length && left.length < 2) ||
        (right.length && right.length < 2)
    );
    // Check also for multiple layers that can stack for percentage charts
    // Make sure that if multiple dimensions are defined for a single dataLayer, they should belong to the same axis
    const hasOnlyOneAccessor =
      layerHasOnlyOneAccessor &&
      dataLayers.filter(
        // check that the other layers are compatible with this one
        (l) => {
          if (
            isDataLayer(l) &&
            l.seriesType === dataLayer.seriesType &&
            Boolean(l.xAccessor) === Boolean(dataLayer.xAccessor) &&
            Boolean(l.splitAccessor) === Boolean(dataLayer.splitAccessor)
          ) {
            const { left: localLeft, right: localRight } = groupAxesByType(
              [l],
              newFrame.activeData
            );
            // return true only if matching axis are found
            return (
              l.accessors.length &&
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
          accessors: dataLayer.xAccessor ? [{ columnId: dataLayer.xAccessor }] : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !dataLayer.xAccessor,
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
          accessors: dataLayer.splitAccessor
            ? [
                {
                  columnId: dataLayer.splitAccessor,
                  triggerIcon: 'colorBy' as const,
                  palette: paletteService
                    .get(dataLayer.palette?.name || 'default')
                    .getCategoricalColors(10, dataLayer.palette?.params),
                },
              ]
            : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !dataLayer.splitAccessor,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          required: dataLayer.seriesType.includes('percentage') && hasOnlyOneAccessor,
          enableDimensionEditor: true,
        },
      ],
    };
  },

  getMainPalette: (state) => {
    if (!state || state.layers.length === 0) return;
    return getFirstDataLayer(state.layers)?.palette;
  },

  setDimension(props) {
    const newProps = updateProps(props, this.convertActiveData);
    const { prevState, layerId, columnId, groupId } = newProps;

    const foundLayer: XYLayerConfig | undefined = prevState.layers.find(
      (l) => l.layerId === layerId
    );
    if (!foundLayer) {
      return prevState;
    }

    if (isReferenceLayer(foundLayer)) {
      return setReferenceDimension(newProps);
    }
    if (isAnnotationsLayer(foundLayer)) {
      return setAnnotationsDimension(newProps);
    }

    const newLayer: XYDataLayerConfig = Object.assign({}, foundLayer);
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
    if (!foundLayer || !isDataLayer(foundLayer)) {
      return prevState;
    }
    const isReferenceLine = metrics.some((metric) => metric.agg === 'static_value');
    const axisMode = axisPosition as YAxisMode;
    const yConfig = metrics.map<YConfig>((metric, idx) => {
      return {
        color: metric.color,
        forAccessor: metric.accessor ?? foundLayer.accessors[idx],
        ...(axisMode && { axisMode }),
        ...(isReferenceLine && { fill: chartType === 'area' ? 'below' : ('none' as FillStyle) }),
      };
    });
    const newLayer = {
      ...foundLayer,
      ...(chartType && { seriesType: chartType as SeriesType }),
      ...(palette && { palette }),
      yConfig,
      layerType: isReferenceLine ? layerTypes.REFERENCELINE : layerTypes.DATA,
    } as XYLayerConfig;

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
    const newFrame = updateFrame(prevState, frame, this.convertActiveData);
    const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!foundLayer) {
      return prevState;
    }
    if (isAnnotationsLayer(foundLayer)) {
      const newLayer = { ...foundLayer };
      newLayer.annotations = newLayer.annotations.filter(({ id }) => id !== columnId);

      const newLayers = prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l));
      return {
        ...prevState,
        layers: newLayers,
      };
    }
    const newLayer = { ...foundLayer };
    if (isDataLayer(newLayer)) {
      if (newLayer.xAccessor === columnId) {
        delete newLayer.xAccessor;
      } else if (newLayer.splitAccessor === columnId) {
        delete newLayer.splitAccessor;
        // as the palette is associated with the break down by dimension, remove it together with the dimension
        delete newLayer.palette;
      }
    }
    if (newLayer.accessors.includes(columnId)) {
      newLayer.accessors = newLayer.accessors.filter((a) => a !== columnId);
    }

    if ('yConfig' in newLayer) {
      newLayer.yConfig = newLayer.yConfig?.filter(({ forAccessor }) => forAccessor !== columnId);
    }

    let newLayers = prevState.layers.map((l) => (l.layerId === layerId ? newLayer : l));
    // check if there's any reference layer and pull it off if all data layers have no dimensions set
    // check for data layers if they all still have xAccessors
    const groupsAvailable = getGroupsAvailableInData(
      getDataLayers(prevState.layers),
      newFrame.datasourceLayers,
      newFrame.activeData
    );

    if (
      (Object.keys(groupsAvailable) as Array<'x' | 'yLeft' | 'yRight'>).every(
        (id) => !groupsAvailable[id]
      )
    ) {
      newLayers = newLayers.filter(
        (layer) => isDataLayer(layer) || ('accessors' in layer && layer.accessors.length)
      );
    }

    return {
      ...prevState,
      layers: newLayers,
    };
  },

  renderLayerHeader(domElement, props) {
    const newProps = updateProps(props, this.convertActiveData);
    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <LayerHeader {...newProps} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderToolbar(domElement, props) {
    const newProps = updateProps(props, this.convertActiveData);
    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <XyToolbar {...newProps} useLegacyTimeAxis={useLegacyTimeAxis} />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditor(domElement, props) {
    const newProps = updateProps(props, this.convertActiveData);

    const allProps = {
      ...newProps,
      formatFactory: fieldFormats.deserialize,
      paletteService,
    };
    const layer = props.state.layers.find((l) => l.layerId === props.layerId)!;
    const dimensionEditor = isReferenceLayer(layer) ? (
      <ReferenceLinePanel {...allProps} />
    ) : isAnnotationsLayer(layer) ? (
      <AnnotationsPanel {...allProps} />
    ) : (
      <DimensionEditor {...allProps} />
    );

    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>{dimensionEditor}</I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  shouldBuildDatasourceExpressionManually: () => true,

  convertActiveData: (activeData, state) =>
    convertActiveDataFromIndexesToLayers(activeData, state?.layers),

  toExpression: (state, layers, attributes, datasourceExpressionsByLayers = {}) =>
    toExpression(
      state,
      layers,
      paletteService,
      attributes,
      datasourceExpressionsByLayers,
      eventAnnotationService
    ),

  toPreviewExpression: (state, layers, datasourceExpressionsByLayers = {}) =>
    toPreviewExpression(
      state,
      layers,
      paletteService,
      datasourceExpressionsByLayers,
      eventAnnotationService
    ),

  getErrorMessages(state, datasourceLayers) {
    // Data error handling below here
    const hasNoAccessors = ({ accessors }: XYDataLayerConfig) =>
      accessors == null || accessors.length === 0;

    const dataLayers = getDataLayers(state.layers);
    const hasNoSplitAccessor = ({ splitAccessor, seriesType }: XYDataLayerConfig) =>
      seriesType.includes('percentage') && splitAccessor == null;

    const errors: Array<{
      shortMessage: string;
      longMessage: React.ReactNode;
    }> = [];

    // check if the layers in the state are compatible with this type of chart
    if (state && state.layers.length > 1) {
      // Order is important here: Y Axis is fundamental to exist to make it valid
      const checks: Array<[string, (layer: XYDataLayerConfig) => boolean]> = [
        ['Y', hasNoAccessors],
        ['Break down', hasNoSplitAccessor],
      ];

      // filter out those layers with no accessors at all
      const filteredLayers = dataLayers.filter(
        ({ accessors, xAccessor, splitAccessor, layerType }) =>
          accessors.length > 0 || xAccessor != null || splitAccessor != null
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

      for (const layer of getDataLayers(state.layers)) {
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
    const newFrame = updateFrame(state, frame, this.convertActiveData);

    const filteredLayers = [
      ...getDataLayers(state.layers),
      ...getReferenceLayers(state.layers),
    ].filter(({ accessors }) => accessors.length > 0);

    const accessorsWithArrayValues = [];

    for (const layer of filteredLayers) {
      const { layerId, accessors } = layer;
      const rows = newFrame.activeData?.[layerId] && newFrame.activeData[layerId].rows;
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
  getUniqueLabels(state) {
    return getUniqueLabels(state.layers);
  },
  renderDimensionTrigger({
    columnId,
    label,
    hideTooltip,
    invalid,
    invalidMessage,
  }: {
    columnId: string;
    label?: string;
    hideTooltip?: boolean;
    invalid?: boolean;
    invalidMessage?: string;
  }) {
    if (label) {
      return (
        <DimensionTrigger
          id={columnId}
          hideTooltip={hideTooltip}
          isInvalid={invalid}
          invalidMessage={invalidMessage}
          label={label || defaultAnnotationLabel}
        />
      );
    }
    return null;
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
  frame: Pick<FramePublicAPI, 'activeData' | 'datasourceLayers'>;
  paletteService: PaletteRegistry;
  fieldFormats: FieldFormatsStart;
  state: XYState;
  layer: XYDataLayerConfig;
}) => {
  let mappedAccessors: AccessorConfig[] = accessors.map((accessor) => ({
    columnId: accessor,
  }));

  if (frame.activeData) {
    const colorAssignments = getColorAssignments(
      getDataLayers(state.layers),
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
