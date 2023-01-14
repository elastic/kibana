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
import { IconChartBarReferenceLine, IconChartBarAnnotations } from '@kbn/chart-icons';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { CoreStart, ThemeServiceStart } from '@kbn/core/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { generateId } from '../../id_generator';
import {
  isDraggedDataViewField,
  isOperationFromCompatibleGroup,
  isOperationFromTheSameGroup,
  renewIDs,
} from '../../utils';
import { getSuggestions } from './xy_suggestions';
import { XyToolbar } from './xy_config_panel';
import {
  DataDimensionEditorDataSectionExtra,
  DimensionEditor,
} from './xy_config_panel/dimension_editor';
import { LayerHeader, LayerHeaderContent } from './xy_config_panel/layer_header';
import type {
  Visualization,
  AccessorConfig,
  FramePublicAPI,
  Suggestion,
  UserMessage,
} from '../../types';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import {
  type State,
  type XYLayerConfig,
  type XYDataLayerConfig,
  type SeriesType,
  type PersistedState,
  type XYAnnotationLayerConfig,
  visualizationTypes,
} from './types';
import {
  extractReferences,
  getAnnotationLayerErrors,
  injectReferences,
  isHorizontalChart,
} from './state_helpers';
import { toExpression, toPreviewExpression, getSortedAccessors } from './to_expression';
import { getAccessorColorConfigs, getColorAssignments } from './color_assignment';
import { getColumnToLabelMap } from './state_helpers';
import {
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
  onAnnotationDrop,
  isDateHistogram,
} from './annotations/helpers';
import {
  checkXAccessorCompatibility,
  defaultSeriesType,
  getAnnotationsLayers,
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
import type { XYState } from './types';
import { ReferenceLinePanel } from './xy_config_panel/reference_line_config_panel';
import { AnnotationsPanel } from './xy_config_panel/annotations_config_panel';
import { DimensionTrigger } from '../../shared_components/dimension_trigger';
import { defaultAnnotationLabel } from './annotations/helpers';
import { onDropForVisualization } from '../../editor_frame_service/editor_frame/config_panel/buttons/drop_targets_utils';
import {
  createAnnotationActions,
  IGNORE_GLOBAL_FILTERS_ACTION_ID,
  KEEP_GLOBAL_FILTERS_ACTION_ID,
} from './annotations/actions';

const XY_ID = 'lnsXY';
export const getXyVisualization = ({
  core,
  storage,
  data,
  paletteService,
  fieldFormats,
  useLegacyTimeAxis,
  kibanaTheme,
  eventAnnotationService,
  unifiedSearch,
}: {
  core: CoreStart;
  storage: IStorageWrapper;
  data: DataPublicPluginStart;
  paletteService: PaletteRegistry;
  eventAnnotationService: EventAnnotationServiceType;
  fieldFormats: FieldFormatsStart;
  useLegacyTimeAxis: boolean;
  kibanaTheme: ThemeServiceStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}): Visualization<State, PersistedState> => ({
  id: XY_ID,
  visualizationTypes,
  getVisualizationTypeId(state) {
    const type = getVisualizationType(state);
    return type === 'mixed' ? type : type.id;
  },

  getLayerIds(state) {
    return getLayersByType(state).map((l) => l.layerId);
  },

  getRemoveOperation(state, layerId) {
    const dataLayers = getLayersByType(state, LayerTypes.DATA).map((l) => l.layerId);
    return dataLayers.includes(layerId) && dataLayers.length === 1 ? 'clear' : 'remove';
  },

  removeLayer(state, layerId) {
    return {
      ...state,
      layers: state.layers.filter((l) => l.layerId !== layerId),
    };
  },

  cloneLayer(state, layerId, newLayerId, clonedIDsMap) {
    const toCopyLayer = state.layers.find((l) => l.layerId === layerId);
    if (toCopyLayer) {
      if (isAnnotationsLayer(toCopyLayer)) {
        toCopyLayer.annotations.forEach((i) => clonedIDsMap.set(i.id, generateId()));
      }
      const newLayer = renewIDs(toCopyLayer, [...clonedIDsMap.keys()], (id: string) =>
        clonedIDsMap.get(id)
      );
      newLayer.layerId = newLayerId;
      return {
        ...state,
        layers: [...state.layers, newLayer],
      };
    }
    return state;
  },

  appendLayer(state, layerId, layerType, indexPatternId) {
    if (layerType === 'metricTrendline') {
      return state;
    }

    const firstUsedSeriesType = getDataLayers(state.layers)?.[0]?.seriesType;
    return {
      ...state,
      layers: [
        ...state.layers,
        newLayerState({
          seriesType: firstUsedSeriesType || state.preferredSeriesType,
          layerId,
          layerType,
          indexPatternId,
        }),
      ],
    };
  },

  clearLayer(state, layerId, indexPatternId) {
    return {
      ...state,
      layers: state.layers.map((l) =>
        l.layerId !== layerId
          ? l
          : newLayerState({
              seriesType: state.preferredSeriesType,
              layerId,
              indexPatternId,
            })
      ),
    };
  },

  getPersistableState(state) {
    return extractReferences(state);
  },

  fromPersistableState(state, references, initialContext) {
    return injectReferences(state, references, initialContext);
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
            layerType: LayerTypes.DATA,
          },
        ],
      }
    );
  },

  getLayerType(layerId, state) {
    return state?.layers.find(({ layerId: id }) => id === layerId)?.layerType;
  },

  getSupportedLayers(state, frame) {
    return [
      supportedDataLayer,
      getAnnotationsSupportedLayer(state, frame),
      getReferenceSupportedLayer(state, frame),
    ];
  },

  getSupportedActionsForLayer(layerId, state) {
    const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
    const layer = state.layers[layerIndex];
    const actions = [];
    if (isAnnotationsLayer(layer)) {
      actions.push(...createAnnotationActions({ state, layerIndex, layer }));
    }
    return actions;
  },

  onLayerAction(layerId, actionId, state) {
    if ([IGNORE_GLOBAL_FILTERS_ACTION_ID, KEEP_GLOBAL_FILTERS_ACTION_ID].includes(actionId)) {
      return {
        ...state,
        layers: state.layers.map((layer) =>
          layer.layerId === layerId
            ? {
                ...layer,
                ignoreGlobalFilters: !(layer as XYAnnotationLayerConfig).ignoreGlobalFilters,
              }
            : layer
        ),
      };
    }

    return state;
  },

  onIndexPatternChange(state, indexPatternId, layerId) {
    const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
    const layer = state.layers[layerIndex];
    if (!layer || !isAnnotationsLayer(layer)) {
      return state;
    }
    const newLayers = [...state.layers];
    newLayers[layerIndex] = { ...layer, indexPatternId };
    return {
      ...state,
      layers: newLayers,
    };
  },

  getConfiguration({ state, frame, layerId }) {
    const layer = state.layers.find((l) => l.layerId === layerId);
    if (!layer) {
      return { groups: [] };
    }

    if (isAnnotationsLayer(layer)) {
      return getAnnotationsConfiguration({ state, frame, layer });
    }

    const sortedAccessors: string[] = getSortedAccessors(
      frame.datasourceLayers[layer.layerId],
      layer
    );
    if (isReferenceLayer(layer)) {
      return getReferenceConfiguration({ state, frame, layer, sortedAccessors });
    }

    const mappedAccessors = getMappedAccessors({
      state,
      frame,
      layer,
      fieldFormats,
      paletteService,
      accessors: sortedAccessors,
    });

    const dataLayer: XYDataLayerConfig = layer;

    const dataLayers = getDataLayers(state.layers);
    const isHorizontal = isHorizontalChart(state.layers);
    const { left, right } = groupAxesByType([layer], frame.activeData);
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
            const { left: localLeft, right: localRight } = groupAxesByType([l], frame.activeData);
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
          isMetricDimension: true,
          supportsMoreColumns: true,
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsXY_yDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          groupId: 'breakdown',
          groupLabel: i18n.translate('xpack.lens.xyChart.splitSeries', {
            defaultMessage: 'Breakdown',
          }),
          accessors: dataLayer.splitAccessor
            ? [
                {
                  columnId: dataLayer.splitAccessor,
                  triggerIconType: dataLayer.collapseFn ? 'aggregate' : 'colorBy',
                  palette: dataLayer.collapseFn
                    ? undefined
                    : paletteService
                        .get(dataLayer.palette?.name || 'default')
                        .getCategoricalColors(10, dataLayer.palette?.params),
                },
              ]
            : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !dataLayer.splitAccessor,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          requiredMinDimensionCount:
            dataLayer.seriesType.includes('percentage') && hasOnlyOneAccessor ? 1 : 0,
          enableDimensionEditor: true,
        },
      ],
    };
  },

  getMainPalette: (state) => {
    if (!state || state.layers.length === 0) return;
    return getFirstDataLayer(state.layers)?.palette;
  },

  getDropProps(dropProps) {
    if (!dropProps.source) {
      return;
    }
    const srcDataView = dropProps.source.indexPatternId;
    const targetDataView = dropProps.target.indexPatternId;
    if (!targetDataView || srcDataView !== targetDataView) {
      return;
    }

    if (isDraggedDataViewField(dropProps.source)) {
      if (dropProps.source.field.type === 'document') {
        return;
      }
      return dropProps.target.isNewColumn
        ? { dropTypes: ['field_add'] }
        : { dropTypes: ['field_replace'] };
    }

    if (isOperationFromTheSameGroup(dropProps.source, dropProps.target)) {
      return dropProps.target.isNewColumn
        ? { dropTypes: ['duplicate_compatible'] }
        : { dropTypes: ['reorder'] };
    }
    if (isOperationFromCompatibleGroup(dropProps.source, dropProps.target)) {
      return {
        dropTypes: dropProps.target.isNewColumn
          ? ['move_compatible', 'duplicate_compatible']
          : ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible'],
      };
    }
  },

  onDrop(props) {
    const targetLayer: XYLayerConfig | undefined = props.prevState.layers.find(
      (l) => l.layerId === props.target.layerId
    );
    if (!targetLayer) {
      throw new Error('target layer should exist');
    }

    if (isAnnotationsLayer(targetLayer)) {
      return onAnnotationDrop?.(props) || props.prevState;
    }
    return onDropForVisualization(props, this);
  },

  setDimension(props) {
    const { prevState, layerId, columnId, groupId } = props;

    const foundLayer: XYLayerConfig | undefined = prevState.layers.find(
      (l) => l.layerId === layerId
    );
    if (!foundLayer) {
      return prevState;
    }

    if (isReferenceLayer(foundLayer)) {
      return setReferenceDimension(props);
    }
    if (isAnnotationsLayer(foundLayer)) {
      return setAnnotationsDimension(props);
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

  removeDimension({ prevState, layerId, columnId, frame }) {
    const foundLayer = prevState.layers.find((l) => l.layerId === layerId);
    if (!foundLayer) {
      return prevState;
    }
    if (isAnnotationsLayer(foundLayer)) {
      const newLayer = {
        ...foundLayer,
        annotations: foundLayer.annotations.filter(({ id }) => id !== columnId),
      };

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
      frame.datasourceLayers,
      frame.activeData
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

  renderLayerPanel(domElement, props) {
    const { onChangeIndexPattern, ...otherProps } = props;
    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <LayerHeaderContent
            {...otherProps}
            onChangeIndexPattern={(indexPatternId) => {
              // TODO: should it trigger an action as in the datasource?
              onChangeIndexPattern(indexPatternId);
            }}
          />
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
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
    const allProps = {
      ...props,
      datatableUtilities: data.datatableUtilities,
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
        <I18nProvider>
          <KibanaContextProvider
            services={{
              appName: 'lens',
              storage,
              uiSettings: core.uiSettings,
              data,
              fieldFormats,
              savedObjects: core.savedObjects,
              docLinks: core.docLinks,
              http: core.http,
              unifiedSearch,
            }}
          >
            {dimensionEditor}
          </KibanaContextProvider>
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

  renderDimensionEditorDataExtra(domElement, props) {
    const allProps = {
      ...props,
      datatableUtilities: data.datatableUtilities,
      formatFactory: fieldFormats.deserialize,
      paletteService,
    };
    const layer = props.state.layers.find((l) => l.layerId === props.layerId)!;
    if (isReferenceLayer(layer)) {
      return;
    }
    if (isAnnotationsLayer(layer)) {
      return;
    }

    render(
      <KibanaThemeProvider theme$={kibanaTheme.theme$}>
        <I18nProvider>
          <KibanaContextProvider
            services={{
              appName: 'lens',
              storage,
              uiSettings: core.uiSettings,
              data,
              fieldFormats,
              savedObjects: core.savedObjects,
              docLinks: core.docLinks,
              http: core.http,
              unifiedSearch,
            }}
          >
            <DataDimensionEditorDataSectionExtra {...allProps} />
          </KibanaContextProvider>
        </I18nProvider>
      </KibanaThemeProvider>,
      domElement
    );
  },

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

  getUserMessages(state, { frame }) {
    const { datasourceLayers, dataViews, activeData } = frame;
    const annotationLayers = getAnnotationsLayers(state.layers);
    const errors: UserMessage[] = [];

    const hasDateHistogram = isDateHistogram(getDataLayers(state.layers), frame);

    annotationLayers.forEach((layer) => {
      layer.annotations.forEach((annotation) => {
        if (!hasDateHistogram) {
          errors.push({
            severity: 'error',
            fixableInEditor: true,
            displayLocations: [
              { id: 'dimensionTrigger', dimensionId: annotation.id, layerId: layer.layerId },
            ],
            shortMessage: i18n.translate(
              'xpack.lens.xyChart.addAnnotationsLayerLabelDisabledHelp',
              {
                defaultMessage:
                  'Annotations require a time based chart to work. Add a date histogram.',
              }
            ),
            longMessage: '',
          });
        }

        const errorMessages = getAnnotationLayerErrors(layer, annotation.id, dataViews);
        errors.push(
          ...errorMessages.map((errorMessage) => {
            const message: UserMessage = {
              severity: 'error',
              fixableInEditor: true,
              displayLocations: [
                { id: 'visualization' },
                { id: 'dimensionTrigger', dimensionId: annotation.id, layerId: layer.layerId },
              ],
              shortMessage: errorMessage,
              longMessage: (
                <FormattedMessage
                  id="xpack.lens.xyChart.annotationError"
                  defaultMessage="Annotation {annotationName} has an error: {errorMessage}"
                  values={{
                    annotationName: annotation.label,
                    errorMessage,
                  }}
                />
              ),
            };
            return message;
          })
        );
      });
    });

    // Data error handling below here
    const hasNoAccessors = ({ accessors }: XYDataLayerConfig) =>
      accessors == null || accessors.length === 0;

    const dataLayers = getDataLayers(state.layers);
    const hasNoSplitAccessor = ({ splitAccessor, seriesType }: XYDataLayerConfig) =>
      seriesType.includes('percentage') && splitAccessor == null;

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
          errors.push({
            severity: 'error',
            fixableInEditor: true,
            displayLocations: [{ id: 'visualization' }],
            shortMessage: result.payload.shortMessage,
            longMessage: result.payload.longMessage,
          });
        }
      }
    }
    // temporary fix for #87068
    errors.push(
      ...checkXAccessorCompatibility(state, datasourceLayers).map(
        ({ shortMessage, longMessage }) =>
          ({
            severity: 'error',
            fixableInEditor: true,
            displayLocations: [{ id: 'visualization' }],
            shortMessage,
            longMessage,
          } as UserMessage)
      )
    );

    for (const layer of getDataLayers(state.layers)) {
      const datasourceAPI = datasourceLayers[layer.layerId];
      if (datasourceAPI) {
        for (const accessor of layer.accessors) {
          const operation = datasourceAPI.getOperationForColumnId(accessor);
          if (operation && operation.dataType !== 'number') {
            errors.push({
              severity: 'error',
              fixableInEditor: true,
              displayLocations: [{ id: 'visualization' }],
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

    const warnings: UserMessage[] = [];

    if (state?.layers.length > 0 && activeData) {
      const filteredLayers = [
        ...getDataLayers(state.layers),
        ...getReferenceLayers(state.layers),
      ].filter(({ accessors }) => accessors.length > 0);

      const accessorsWithArrayValues = [];

      for (const layer of filteredLayers) {
        const { layerId, accessors } = layer;
        const rows = activeData?.[layerId] && activeData[layerId].rows;
        if (!rows) {
          break;
        }
        const columnToLabel = getColumnToLabelMap(layer, datasourceLayers[layerId]);
        for (const accessor of accessors) {
          const hasArrayValues = rows.some((row) => Array.isArray(row[accessor]));
          if (hasArrayValues) {
            accessorsWithArrayValues.push(columnToLabel[accessor]);
          }
        }
      }

      accessorsWithArrayValues.forEach((label) =>
        warnings.push({
          severity: 'warning',
          fixableInEditor: true,
          displayLocations: [{ id: 'toolbar' }],
          shortMessage: '',
          longMessage: (
            <FormattedMessage
              key={label}
              id="xpack.lens.xyVisualization.arrayValues"
              defaultMessage="{label} contains array values. Your visualization may not render as expected."
              values={{
                label: <strong>{label}</strong>,
              }}
            />
          ),
        })
      );
    }

    return [...errors, ...warnings];
  },

  getUniqueLabels(state) {
    return getUniqueLabels(state.layers);
  },
  getUsedDataView(state, layerId) {
    return getAnnotationsLayers(state.layers).find((l) => l.layerId === layerId)?.indexPatternId;
  },
  getUsedDataViews(state) {
    return (
      state?.layers.filter(isAnnotationsLayer).map(({ indexPatternId }) => indexPatternId) ?? []
    );
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

  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<Suggestion<XYState, FormBasedPersistedState>>;
    const suggestion: Suggestion<XYState, FormBasedPersistedState> = {
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
        ...(context.configuration as XYState),
      },
    };
    return suggestion;
  },

  getVisualizationInfo(state: XYState) {
    const isHorizontal = isHorizontalChart(state.layers);
    const visualizationLayersInfo = state.layers.map((layer) => {
      const dimensions = [];
      let chartType: SeriesType | undefined;
      let icon;
      let label;
      if (isDataLayer(layer)) {
        chartType = layer.seriesType;
        const layerVisType = visualizationTypes.find((visType) => visType.id === chartType);
        icon = layerVisType?.icon;
        label = layerVisType?.fullLabel || layerVisType?.label;
        if (layer.xAccessor) {
          dimensions.push({
            name: getAxisName('x', { isHorizontal }),
            id: layer.xAccessor,
            dimensionType: 'x',
          });
        }
        if (layer.accessors && layer.accessors.length) {
          layer.accessors.forEach((accessor) => {
            dimensions.push({
              name: getAxisName('y', { isHorizontal }),
              id: accessor,
              dimensionType: 'y',
            });
          });
        }
        if (layer.splitAccessor) {
          dimensions.push({
            name: i18n.translate('xpack.lens.xyChart.splitSeries', {
              defaultMessage: 'Breakdown',
            }),
            dimensionType: 'breakdown',
            id: layer.splitAccessor,
          });
        }
      }
      if (isReferenceLayer(layer) && layer.accessors && layer.accessors.length) {
        layer.accessors.forEach((accessor) => {
          dimensions.push({
            name: i18n.translate('xpack.lens.xyChart.layerReferenceLine', {
              defaultMessage: 'Reference line',
            }),
            dimensionType: 'reference_line',
            id: accessor,
          });
        });
        label = i18n.translate('xpack.lens.xyChart.layerReferenceLineLabel', {
          defaultMessage: 'Reference lines',
        });
        icon = IconChartBarReferenceLine;
      }
      if (isAnnotationsLayer(layer) && layer.annotations && layer.annotations.length) {
        layer.annotations.forEach((annotation) => {
          dimensions.push({
            name: i18n.translate('xpack.lens.xyChart.layerAnnotation', {
              defaultMessage: 'Annotation',
            }),
            dimensionType: 'annotation',
            id: annotation.id,
          });
        });
        label = i18n.translate('xpack.lens.xyChart.layerAnnotationsLabel', {
          defaultMessage: 'Annotations',
        });
        icon = IconChartBarAnnotations;
      }

      return {
        layerId: layer.layerId,
        layerType: layer.layerType,
        chartType,
        icon,
        label,
        dimensions,
      };
    });
    return {
      layers: visualizationLayersInfo,
    };
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
    mappedAccessors = getAccessorColorConfigs(
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
