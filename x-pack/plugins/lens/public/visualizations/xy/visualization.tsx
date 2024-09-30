/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { Position } from '@elastic/charts';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { PaletteRegistry } from '@kbn/coloring';
import { IconChartBarReferenceLine, IconChartBarAnnotations } from '@kbn/chart-icons';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { CoreStart, SavedObjectReference, ThemeServiceStart } from '@kbn/core/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { getAnnotationAccessor } from '@kbn/event-annotation-components';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { isEqual } from 'lodash';
import { type AccessorConfig, DimensionTrigger } from '@kbn/visualization-ui-components';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getColorsFromMapping } from '@kbn/coloring';
import useObservable from 'react-use/lib/useObservable';
import { EuiPopover, EuiSelectable } from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { generateId } from '../../id_generator';
import {
  isDraggedDataViewField,
  isOperationFromCompatibleGroup,
  isOperationFromTheSameGroup,
  nonNullable,
  renewIDs,
  getColorMappingDefaults,
} from '../../utils';
import { getSuggestions } from './xy_suggestions';
import { XyToolbar, updateLayer } from './xy_config_panel';
import {
  DataDimensionEditor,
  DataDimensionEditorDataSectionExtra,
} from './xy_config_panel/dimension_editor';
import {
  ReferenceLayerHeader,
  AnnotationsLayerHeader,
  LayerHeaderContent,
} from './xy_config_panel/layer_header';
import type {
  Visualization,
  FramePublicAPI,
  Suggestion,
  UserMessage,
  AnnotationGroups,
} from '../../types';
import type { FormBasedPersistedState } from '../../datasources/form_based/types';
import {
  type State,
  type XYLayerConfig,
  type XYDataLayerConfig,
  type SeriesType,
  visualizationSubtypes,
  visualizationTypes,
} from './types';
import {
  getAnnotationLayerErrors,
  isHorizontalChart,
  annotationLayerHasUnsavedChanges,
  isHorizontalSeries,
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
} from './annotations/helpers';
import {
  checkXAccessorCompatibility,
  defaultSeriesType,
  getAnnotationLayerTitle,
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
  isByReferenceAnnotationsLayer,
  isDataLayer,
  isNumericDynamicMetric,
  isReferenceLayer,
  newLayerState,
  supportedDataLayer,
  validateLayersForDimension,
  isTimeChart,
} from './visualization_helpers';
import { getAxesConfiguration, groupAxesByType } from './axes_configuration';
import type { XYByValueAnnotationLayerConfig, XYState } from './types';
import { defaultAnnotationLabel } from './annotations/helpers';
import { onDropForVisualization } from '../../editor_frame_service/editor_frame/config_panel/buttons/drop_targets_utils';
import { createAnnotationActions } from './annotations/actions';
import { AddLayerButton } from './add_layer';
import { LayerSettings } from './layer_settings';
import { IgnoredGlobalFiltersEntries } from '../../shared_components/ignore_global_filter';
import { getColorMappingTelemetryEvents } from '../../lens_ui_telemetry/color_telemetry_helpers';
import { getLegendStatsTelemetryEvents } from './legend_stats_telemetry_helpers';
import { XYPersistedState, convertToPersistable, convertToRuntime } from './persistence';
import { shouldDisplayTable } from '../../shared_components/legend/legend_settings_popover';
import {
  ANNOTATION_MISSING_DATE_HISTOGRAM,
  LAYER_SETTINGS_IGNORE_GLOBAL_FILTERS,
  XY_MIXED_LOG_SCALE,
  XY_MIXED_LOG_SCALE_DIMENSION,
  XY_RENDER_ARRAY_VALUES,
  XY_X_WRONG_DATA_TYPE,
  XY_Y_WRONG_DATA_TYPE,
} from '../../user_messages_ids';
import { AnnotationsPanel } from './xy_config_panel/annotations_config_panel/annotations_panel';
import { ReferenceLinePanel } from './xy_config_panel/reference_line_config_panel/reference_line_panel';

const XY_ID = 'lnsXY';

export type ExtraAppendLayerArg = EventAnnotationGroupConfig & { annotationGroupId: string };

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
  dataViewsService,
  savedObjectsTagging,
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
  dataViewsService: DataViewsPublicPluginStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
}): Visualization<State, XYPersistedState, ExtraAppendLayerArg> => ({
  id: XY_ID,
  getVisualizationTypeId(state, layerId) {
    const type = getVisualizationType(state, layerId);
    return type === 'mixed' ? type : type.id;
  },

  visualizationTypes,

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

      let newLayer = renewIDs(toCopyLayer, [...clonedIDsMap.keys()], (id: string) =>
        clonedIDsMap.get(id)
      );

      newLayer.layerId = newLayerId;

      if (isAnnotationsLayer(newLayer) && isByReferenceAnnotationsLayer(newLayer)) {
        const byValueVersion: XYByValueAnnotationLayerConfig = {
          annotations: newLayer.annotations,
          ignoreGlobalFilters: newLayer.ignoreGlobalFilters,
          layerId: newLayer.layerId,
          layerType: newLayer.layerType,
          indexPatternId: newLayer.indexPatternId,
        };

        newLayer = byValueVersion;
      }

      return {
        ...state,
        layers: [...state.layers, newLayer],
      };
    }
    return state;
  },

  appendLayer(state, layerId, layerType, indexPatternId, extraArg, seriesType) {
    if (layerType === 'metricTrendline') {
      return state;
    }

    return {
      ...state,
      layers: [
        ...state.layers,
        newLayerState({
          layerId,
          layerType,
          seriesType:
            seriesType || getDataLayers(state.layers)?.[0]?.seriesType || state.preferredSeriesType,
          indexPatternId,
          extraArg,
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
    return convertToPersistable(state);
  },

  getDescription,

  switchVisualizationType(seriesType: string, state: State, layerId?: string) {
    const dataLayer = state.layers.find((l) => l.layerId === layerId);
    if (dataLayer && !isDataLayer(dataLayer)) {
      throw new Error('Cannot switch series type for non-data layer');
    }
    if (!dataLayer) {
      return state;
    }
    // todo: test how they switch between percentage etc
    const currentStackingType = stackingTypes.find(({ subtypes }) =>
      subtypes.includes(dataLayer.seriesType)
    );
    const chosenTypeIndex = defaultSeriesTypesByIndex.indexOf(seriesType);

    const compatibleSeriesType: SeriesType = (currentStackingType?.subtypes[chosenTypeIndex] ||
      seriesType) as SeriesType;

    return {
      ...state,
      preferredSeriesType: compatibleSeriesType,
      layers: layerId
        ? state.layers.map((layer) =>
            layer.layerId === layerId ? { ...layer, seriesType: compatibleSeriesType } : layer
          )
        : state.layers.map((layer) => ({ ...layer, seriesType: compatibleSeriesType })),
    };
  },

  getSuggestions,

  triggers: [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush],

  initialize(
    addNewLayer,
    state,
    mainPalette?,
    annotationGroups?: AnnotationGroups,
    references?: SavedObjectReference[]
  ) {
    if (state) {
      return convertToRuntime(state, annotationGroups!, references);
    }
    return {
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
          palette: mainPalette?.type === 'legacyPalette' ? mainPalette.value : undefined,
          colorMapping:
            mainPalette?.type === 'colorMapping' ? mainPalette.value : getColorMappingDefaults(),
        },
      ],
    };
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

  getSupportedActionsForLayer(
    layerId,
    state,
    setState,
    registerLibraryAnnotationGroup,
    isSaveable
  ) {
    const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
    const layer = state.layers[layerIndex];
    const actions = [];
    if (isAnnotationsLayer(layer)) {
      actions.push(
        ...createAnnotationActions({
          state,
          layer,
          setState,
          registerLibraryAnnotationGroup,
          core,
          isSaveable,
          eventAnnotationService,
          savedObjectsTagging,
          dataViews: data.dataViews,
          startServices: core,
        })
      );
    }
    return actions;
  },

  getCustomRemoveLayerText(layerId, state) {
    const layerIndex = state.layers.findIndex((l) => l.layerId === layerId);
    const layer = state.layers[layerIndex];
    if (layer && isByReferenceAnnotationsLayer(layer)) {
      return { title: `Delete "${getAnnotationLayerTitle(layer)}"` };
    }
  },

  hasLayerSettings({ state, layerId: currentLayerId }) {
    const layer = state.layers?.find(({ layerId }) => layerId === currentLayerId);
    return { data: Boolean(layer && isAnnotationsLayer(layer)), appearance: false };
  },

  LayerSettingsComponent(props) {
    return <LayerSettings {...props} />;
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

    const canUseColorMapping = layer.colorMapping ? true : false;
    let colors: string[] = [];
    if (canUseColorMapping) {
      kibanaTheme.theme$
        .subscribe({
          next(theme) {
            colors = getColorsFromMapping(theme.darkMode, layer.colorMapping);
          },
        })
        .unsubscribe();
    } else {
      colors = paletteService
        .get(dataLayer.palette?.name || 'default')
        .getCategoricalColors(10, dataLayer.palette?.params);
    }

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
                  palette: dataLayer.collapseFn ? undefined : colors,
                },
              ]
            : [],
          filterOperations: isBucketed,
          supportsMoreColumns: !dataLayer.splitAccessor,
          dataTestSubj: 'lnsXY_splitDimensionPanel',
          requiredMinDimensionCount:
            dataLayer.seriesType.includes('percentage') && hasOnlyOneAccessor ? 1 : 0,
          enableDimensionEditor: true,
          isBreakdownDimension: true,
        },
      ],
    };
  },

  getMainPalette: (state) => {
    if (!state || state.layers.length === 0) return;
    const firstDataLayer = getFirstDataLayer(state.layers);

    return firstDataLayer?.colorMapping
      ? { type: 'colorMapping', value: firstDataLayer.colorMapping }
      : firstDataLayer?.palette
      ? { type: 'legacyPalette', value: firstDataLayer.palette }
      : undefined;
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

  LayerPanelComponent(props) {
    const { onChangeIndexPattern, ...otherProps } = props;

    return (
      <LayerHeaderContent
        {...otherProps}
        onChangeIndexPattern={(indexPatternId) => {
          onChangeIndexPattern(indexPatternId);
        }}
      />
    );
  },

  isSubtypeCompatible(subtype1, subtype2) {
    return (
      (isHorizontalSeries(subtype1 as SeriesType) && isHorizontalSeries(subtype2 as SeriesType)) ||
      (!isHorizontalSeries(subtype1 as SeriesType) && !isHorizontalSeries(subtype2 as SeriesType))
    );
  },
  getSubtypeSwitch({ state, setState, layerId }) {
    const index = state.layers.findIndex((l) => l.layerId === layerId);
    const layer = state.layers[index];

    if (!layer || !isDataLayer(layer) || layer.seriesType === 'line') {
      return null;
    }

    return () => (
      <SubtypeSwitch
        layer={layer}
        setLayerState={(newLayer: XYDataLayerConfig) =>
          setState(updateLayer(state, newLayer, index))
        }
      />
    );
  },

  getCustomLayerHeader(props) {
    const layer = props.state.layers.find((l) => l.layerId === props.layerId);
    if (!layer) {
      return undefined;
    }
    if (isReferenceLayer(layer)) {
      return <ReferenceLayerHeader />;
    }
    if (isAnnotationsLayer(layer)) {
      return (
        <AnnotationsLayerHeader
          title={getAnnotationLayerTitle(layer)}
          hasUnsavedChanges={annotationLayerHasUnsavedChanges(layer)}
        />
      );
    }
    return undefined;
  },

  ToolbarComponent(props) {
    return <XyToolbar {...props} useLegacyTimeAxis={useLegacyTimeAxis} />;
  },

  DimensionEditorComponent(props) {
    const allProps = {
      ...props,
      datatableUtilities: data.datatableUtilities,
      formatFactory: fieldFormats.deserialize,
      paletteService,
    };

    const isDarkMode: boolean = useObservable(kibanaTheme.theme$, { darkMode: false }).darkMode;
    const layer = props.state.layers.find((l) => l.layerId === props.layerId)!;
    const dimensionEditor = isReferenceLayer(layer) ? (
      <ReferenceLinePanel {...allProps} />
    ) : isAnnotationsLayer(layer) ? (
      <AnnotationsPanel {...allProps} dataViewsService={dataViewsService} />
    ) : (
      <DataDimensionEditor {...allProps} isDarkMode={isDarkMode} />
    );

    return dimensionEditor;
  },

  DimensionEditorDataExtraComponent(props) {
    const allProps = {
      ...props,
      datatableUtilities: data.datatableUtilities,
      formatFactory: fieldFormats.deserialize,
      paletteService,
    };
    const layer = props.state.layers.find((l) => l.layerId === props.layerId)!;
    if (isReferenceLayer(layer)) {
      return null;
    }
    if (isAnnotationsLayer(layer)) {
      return null;
    }

    return <DataDimensionEditorDataSectionExtra {...allProps} />;
  },
  getAddLayerButtonComponent: (props) => {
    return (
      <AddLayerButton
        {...props}
        eventAnnotationService={eventAnnotationService}
        addLayer={async (type, loadedGroupInfo, _, seriesType) => {
          if (type === LayerTypes.ANNOTATIONS && loadedGroupInfo) {
            await props.ensureIndexPattern(
              loadedGroupInfo.dataViewSpec ?? loadedGroupInfo.indexPatternId
            );

            props.registerLibraryAnnotationGroup({
              id: loadedGroupInfo.annotationGroupId,
              group: loadedGroupInfo,
            });
          }
          props.addLayer(type, loadedGroupInfo, !!loadedGroupInfo, seriesType);
        }}
      />
    );
  },
  toExpression: (state, layers, _attributes, datasourceExpressionsByLayers = {}) =>
    toExpression(
      state,
      layers,
      paletteService,
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

    const hasDateHistogram = isTimeChart(getDataLayers(state.layers), frame);

    annotationLayers.forEach((layer) => {
      layer.annotations.forEach((annotation) => {
        if (!hasDateHistogram) {
          errors.push({
            uniqueId: ANNOTATION_MISSING_DATE_HISTOGRAM,
            severity: 'error',
            fixableInEditor: true,
            displayLocations: [{ id: 'dimensionButton', dimensionId: annotation.id }],
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
        errors.push(...errorMessages);
      });
    });

    // check if the layers in the state are compatible with this type of chart
    if (state && state.layers.length > 1) {
      // Order is important here: Y Axis is fundamental to exist to make it valid
      const yLayerValidation = validateLayersForDimension(
        'y',
        state.layers,
        ({ accessors }) => accessors == null || accessors.length === 0 // has no accessor
      );
      if (!yLayerValidation.valid) {
        errors.push(yLayerValidation.error);
      }

      const breakDownLayerValidation = validateLayersForDimension(
        'break_down',
        state.layers,
        ({ splitAccessor, seriesType }) =>
          seriesType.includes('percentage') && splitAccessor == null // check if no split accessor
      );
      if (!breakDownLayerValidation.valid) {
        errors.push(breakDownLayerValidation.error);
      }
    }
    // temporary fix for #87068
    errors.push(
      ...checkXAccessorCompatibility(state, datasourceLayers).map<UserMessage>(
        ({ shortMessage, longMessage }) => ({
          severity: 'error',
          uniqueId: XY_X_WRONG_DATA_TYPE,
          fixableInEditor: true,
          displayLocations: [{ id: 'visualization' }],
          shortMessage,
          longMessage,
        })
      )
    );

    for (const layer of getDataLayers(state.layers)) {
      const datasourceAPI = datasourceLayers[layer.layerId];
      if (datasourceAPI) {
        for (const accessor of layer.accessors) {
          const operation = datasourceAPI.getOperationForColumnId(accessor);
          if (operation && operation.dataType !== 'number') {
            errors.push({
              uniqueId: XY_Y_WRONG_DATA_TYPE,
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
          uniqueId: XY_RENDER_ARRAY_VALUES,
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

    const shouldRotate = state?.layers.length ? isHorizontalChart(state.layers) : false;
    const dataLayers = getDataLayers(state.layers);
    const axisGroups = getAxesConfiguration(dataLayers, shouldRotate, frame.activeData);
    const logAxisGroups = axisGroups.filter(
      ({ groupId }) =>
        (groupId === 'left' && state.yLeftScale === 'log') ||
        (groupId === 'right' && state.yRightScale === 'log')
    );

    if (logAxisGroups.length > 0) {
      logAxisGroups
        .map((axis) => {
          const mixedDomainSeries = axis.series.filter((series) => {
            let hasNegValues = false;
            let hasPosValues = false;
            const arr = activeData?.[series.layer]?.rows ?? [];
            for (let index = 0; index < arr.length; index++) {
              const value = arr[index][series.accessor];

              if (value < 0) {
                hasNegValues = true;
              } else {
                hasPosValues = true;
              }

              if (hasNegValues && hasPosValues) {
                return true;
              }
            }

            return false;
          });
          return {
            ...axis,
            mixedDomainSeries,
          };
        })
        .forEach((axisGroup) => {
          if (axisGroup.mixedDomainSeries.length === 0) return;
          const { groupId } = axisGroup;

          warnings.push({
            // TODO: can we push the group into the metadata and use a correct unique ID here?
            uniqueId: `${XY_MIXED_LOG_SCALE}${groupId}`,
            severity: 'warning',
            shortMessage: '',
            longMessage: (
              <FormattedMessage
                id="xpack.lens.xyVisualization.mixedLogScaleWarning"
                defaultMessage="When the {axisName} axis is set to logarithmic scale, the dataset should not contain positive and negative data."
                values={{
                  axisName:
                    groupId === 'left' ? (
                      <FormattedMessage
                        id="xpack.lens.xyVisualization.mixedLogScaleWarningLeft"
                        defaultMessage="left"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.lens.xyVisualization.mixedLogScaleWarningRight"
                        defaultMessage="right"
                      />
                    ),
                }}
              />
            ),
            displayLocations: [{ id: 'toolbar' }],
            fixableInEditor: true,
          });

          axisGroup.mixedDomainSeries.forEach(({ accessor }) => {
            warnings.push({
              // TODO: can we push the group into the metadata and use a correct unique ID here?
              uniqueId: `${XY_MIXED_LOG_SCALE_DIMENSION}${accessor}`,
              severity: 'warning',
              shortMessage: '',
              longMessage: (
                <FormattedMessage
                  id="xpack.lens.xyVisualization.mixedLogScaleDimensionWarning"
                  defaultMessage="This metric is using logarithmic scale and should not contain positive and negative data."
                />
              ),
              displayLocations: [{ id: 'dimensionButton', dimensionId: accessor }],
              fixableInEditor: true,
            });
          });
        });
    }

    const info = getNotifiableFeatures(state, frame, paletteService, fieldFormats);

    return errors.concat(warnings, info);
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
  DimensionTriggerComponent({ columnId, label }) {
    if (label) {
      return <DimensionTrigger id={columnId} label={label || defaultAnnotationLabel} />;
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

  isEqual(state1, references1, state2, references2, annotationGroups) {
    const injected1 = convertToRuntime(state1, annotationGroups, references1);
    const injected2 = convertToRuntime(state2, annotationGroups, references2);
    return isEqual(injected1, injected2);
  },

  getVisualizationInfo(state, frame) {
    return getVisualizationInfo(state, frame, paletteService, fieldFormats);
  },

  getTelemetryEventsOnSave(state, prevState) {
    const dataLayers = getDataLayers(state.layers);
    const prevLayers = prevState ? getDataLayers(prevState.layers) : undefined;
    const colorMappingEvents = dataLayers.flatMap((l) => {
      const prevLayer = prevLayers?.find((prevL) => prevL.layerId === l.layerId);
      return getColorMappingTelemetryEvents(l.colorMapping, prevLayer?.colorMapping);
    });
    const legendStatsEvents = getLegendStatsTelemetryEvents(
      state.legend.legendStats,
      prevState ? prevState.legend.legendStats : undefined
    );
    return colorMappingEvents.concat(legendStatsEvents);
  },

  getRenderEventCounters(state) {
    if (shouldDisplayTable(state.legend.legendStats ?? [])) {
      return [`legend_stats`];
    }
    return [];
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

function getVisualizationInfo(
  state: XYState,
  frame: Partial<FramePublicAPI> | undefined,
  paletteService: PaletteRegistry,
  fieldFormats: FieldFormatsStart
) {
  const isHorizontal = isHorizontalChart(state.layers);
  const visualizationLayersInfo = state.layers.map((layer) => {
    const palette = [];
    const dimensions = [];
    let chartType: SeriesType | undefined;
    let icon;
    let label;

    if (isDataLayer(layer)) {
      chartType = layer.seriesType;
      const layerVisType = visualizationSubtypes.find((visType) => visType.id === chartType);
      icon = layerVisType?.icon;
      label = layerVisType?.label;

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
        if (frame?.datasourceLayers && frame.activeData) {
          const sortedAccessors: string[] = getSortedAccessors(
            frame.datasourceLayers[layer.layerId],
            layer
          );
          const mappedAccessors = getMappedAccessors({
            state,
            frame: frame as Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>,
            layer,
            fieldFormats,
            paletteService,
            accessors: sortedAccessors,
          });
          palette.push(...mappedAccessors.flatMap(({ color }) => color));
        }
      }
      if (layer.splitAccessor) {
        dimensions.push({
          name: i18n.translate('xpack.lens.xyChart.splitSeries', {
            defaultMessage: 'Breakdown',
          }),
          dimensionType: 'breakdown',
          id: layer.splitAccessor,
        });
        if (!layer.collapseFn) {
          palette.push(
            ...paletteService
              .get(layer.palette?.name || 'default')
              .getCategoricalColors(10, layer.palette?.params)
          );
        }
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
      if (frame?.datasourceLayers && frame.activeData) {
        const sortedAccessors: string[] = getSortedAccessors(
          frame.datasourceLayers[layer.layerId],
          layer
        );
        palette.push(
          ...getReferenceConfiguration({
            state,
            frame: frame as Pick<FramePublicAPI, 'datasourceLayers' | 'activeData'>,
            layer,
            sortedAccessors,
          }).groups.flatMap(({ accessors }) => accessors.map(({ color }) => color))
        );
      }
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
      palette.push(
        ...layer.annotations
          .filter(({ isHidden }) => !isHidden)
          .map((annotation) => getAnnotationAccessor(annotation).color)
      );
    }

    const finalPalette = palette?.filter(nonNullable);

    return {
      layerId: layer.layerId,
      layerType: layer.layerType,
      chartType,
      icon,
      label,
      dimensions,
      palette: finalPalette.length ? finalPalette : undefined,
    };
  });
  return {
    layers: visualizationLayersInfo,
  };
}

function getNotifiableFeatures(
  state: XYState,
  frame: Pick<FramePublicAPI, 'dataViews'> & Partial<FramePublicAPI>,
  paletteService: PaletteRegistry,
  fieldFormats: FieldFormatsStart
): UserMessage[] {
  const annotationsWithIgnoreFlag = getAnnotationsLayers(state.layers).filter(
    (layer) =>
      layer.ignoreGlobalFilters &&
      // If all annotations are manual, do not report it
      layer.annotations.some((annotation) => annotation.type !== 'manual')
  );
  if (!annotationsWithIgnoreFlag.length) {
    return [];
  }
  const visualizationInfo = getVisualizationInfo(state, frame, paletteService, fieldFormats);

  return [
    {
      uniqueId: LAYER_SETTINGS_IGNORE_GLOBAL_FILTERS,
      severity: 'info',
      fixableInEditor: false,
      shortMessage: i18n.translate('xpack.lens.xyChart.layerAnnotationsIgnoreTitle', {
        defaultMessage: 'Layers ignoring global filters',
      }),
      longMessage: (
        <IgnoredGlobalFiltersEntries
          layers={annotationsWithIgnoreFlag.map(({ layerId, indexPatternId }) => ({
            layerId,
            indexPatternId,
          }))}
          visualizationInfo={visualizationInfo}
          dataViews={frame.dataViews}
        />
      ),
      displayLocations: [{ id: 'embeddableBadge' }],
    },
  ];
}

const defaultSeriesTypesByIndex = ['bar', 'area', 'bar_horizontal'];

export const stackingTypes = [
  {
    type: 'stacked',
    label: i18n.translate('xpack.lens.shared.barLayerStacking.stacked', {
      defaultMessage: 'Stacked',
    }),
    subtypes: ['bar_stacked', 'area_stacked', 'bar_horizontal_stacked'],
  },
  {
    type: 'unstacked',
    label: i18n.translate('xpack.lens.shared.barLayerStacking.unstacked', {
      defaultMessage: 'Unstacked',
    }),
    subtypes: ['bar', 'area', 'bar_horizontal'],
  },
  {
    type: 'percentage',
    label: i18n.translate('xpack.lens.shared.barLayerStacking.percentage', {
      defaultMessage: 'Percentage',
    }),
    subtypes: [
      'bar_percentage_stacked',
      'area_percentage_stacked',
      'bar_horizontal_percentage_stacked',
    ],
  },
];

const SubtypeSwitch = ({
  layer,
  setLayerState,
}: {
  layer: XYDataLayerConfig;
  setLayerState: (l: XYDataLayerConfig) => void;
}): JSX.Element | null => {
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const stackingType = stackingTypes.find(({ subtypes }) => subtypes.includes(layer.seriesType));
  if (!stackingType) {
    return null;
  }
  const subTypeIndex = stackingType.subtypes.indexOf(layer.seriesType);
  const options = stackingTypes.map(({ label, subtypes }) => ({
    label,
    value: subtypes[subTypeIndex],
    checked: subtypes[subTypeIndex] === layer.seriesType ? ('on' as const) : undefined,
  }));

  return (
    <>
      <EuiPopover
        ownFocus
        panelPaddingSize="none"
        button={
          <ToolbarButton
            aria-label={i18n.translate('xpack.lens.xyChart.stackingOptions', {
              defaultMessage: 'Stacking',
            })}
            onClick={() => setFlyoutOpen(true)}
            fullWidth
            size="s"
            label={stackingType.label}
          />
        }
        isOpen={flyoutOpen}
        closePopover={() => setFlyoutOpen(false)}
        anchorPosition="downLeft"
      >
        <EuiSelectable
          css={{ width: 200 }}
          singleSelection
          data-test-subj="lnsChartSwitchList"
          options={options}
          onChange={(newOptions) => {
            setFlyoutOpen(false);
            const chosenType = newOptions.find(({ checked }) => checked === 'on');
            if (!chosenType) {
              return;
            }
            setLayerState({
              ...layer,
              seriesType: chosenType.value as SeriesType,
            });
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </>
  );
};
