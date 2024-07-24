/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import type { Query } from '@kbn/es-query';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { MapStoreState } from '../reducers/store';
import {
  createLayerInstance,
  getEditState,
  getLayerById,
  getLayerDescriptor,
  getLayerList,
  getLayerListRaw,
  getMapColors,
  getMapReady,
  getSelectedLayerId,
} from '../selectors/map_selectors';
import { FLYOUT_STATE } from '../reducers/ui';
import { cancelRequest, getInspectorAdapters } from '../reducers/non_serializable_instances';
import { hideTOCDetails, setDrawMode, showTOCDetails, updateFlyout } from './ui_actions';
import {
  ADD_LAYER,
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_LAYER_PROP,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  REMOVE_LAYER,
  REMOVE_TRACKED_LAYER_STATE,
  ROLLBACK_TO_TRACKED_LAYER_STATE,
  SET_JOINS,
  SET_LAYER_VISIBILITY,
  SET_SELECTED_LAYER,
  SET_WAITING_FOR_READY_HIDDEN_LAYERS,
  TRACK_CURRENT_LAYER_STATE,
  UPDATE_LAYER,
  UPDATE_LAYER_ORDER,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE,
  UPDATE_SOURCE_PROP,
} from './map_action_constants';
import { clearDataRequests, syncDataForLayerId, updateStyleMeta } from './data_request_actions';
import {
  Attribution,
  JoinDescriptor,
  LayerDescriptor,
  StyleDescriptor,
  TileError,
  TileMetaFeature,
  VectorLayerDescriptor,
  VectorStyleDescriptor,
} from '../../common/descriptor_types';
import { ILayer } from '../classes/layers/layer';
import { hasVectorLayerMethod } from '../classes/layers/vector_layer';
import { OnSourceChangeArgs } from '../classes/sources/source';
import { isESVectorTileSource } from '../classes/sources/es_source';
import {
  DRAW_MODE,
  LAYER_STYLE_TYPE,
  LAYER_TYPE,
  SCALING_TYPES,
  STYLE_TYPE,
} from '../../common/constants';
import { IVectorStyle } from '../classes/styles/vector/vector_style';
import { notifyLicensedFeatureUsage } from '../licensed_features';
import { IESAggField } from '../classes/fields/agg';
import { IField } from '../classes/fields/field';
import type { IVectorSource } from '../classes/sources/vector_source';
import { getDrawMode, getOpenTOCDetails } from '../selectors/ui_selectors';
import { isLayerGroup, LayerGroup } from '../classes/layers/layer_group';
import { isSpatialJoin } from '../classes/joins/is_spatial_join';

export function trackCurrentLayerState(layerId: string) {
  return {
    type: TRACK_CURRENT_LAYER_STATE,
    layerId,
  };
}

export function rollbackToTrackedLayerStateForSelectedLayer() {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layerId = getSelectedLayerId(getState());
    await dispatch({
      type: ROLLBACK_TO_TRACKED_LAYER_STATE,
      layerId,
    });

    // Ensure updateStyleMeta is triggered
    // syncDataForLayer may not trigger endDataLoad if no re-fetch is required
    dispatch(updateStyleMeta(layerId));

    dispatch(syncDataForLayerId(layerId, false));
  };
}

export function removeTrackedLayerStateForSelectedLayer() {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    const layerId = getSelectedLayerId(getState());
    dispatch({
      type: REMOVE_TRACKED_LAYER_STATE,
      layerId,
    });
  };
}

export function replaceLayerList(newLayerList: LayerDescriptor[]) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const isMapReady = getMapReady(getState());
    if (!isMapReady) {
      dispatch({
        type: CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
      });
    } else {
      getLayerListRaw(getState()).forEach(({ id }) => {
        dispatch(removeLayerFromLayerList(id));
      });
    }

    newLayerList.forEach((layerDescriptor) => {
      dispatch(addLayer(layerDescriptor));
    });
  };
}

export function updateLayerDescriptor(layerDescriptor: LayerDescriptor) {
  return {
    type: UPDATE_LAYER,
    layer: layerDescriptor,
  };
}

export function cloneLayer(layerId: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }

    (await layer.cloneDescriptor()).forEach((layerDescriptor) => {
      dispatch(addLayer(layerDescriptor));
      if (layer.getParent()) {
        dispatch(moveLayerToLeftOfTarget(layerDescriptor.id, layerId));
      }
    });
  };
}

export function addLayer(layerDescriptor: LayerDescriptor) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const isMapReady = getMapReady(getState());
    if (!isMapReady) {
      dispatch({
        type: ADD_WAITING_FOR_MAP_READY_LAYER,
        layer: layerDescriptor,
      });
      return;
    }

    dispatch({
      type: ADD_LAYER,
      layer: layerDescriptor,
    });
    dispatch(syncDataForLayerId(layerDescriptor.id, false));
    const layer = createLayerInstance(layerDescriptor, []); // custom icons not needed, layer instance only used to get licensed features
    const features = await layer.getLicensedFeatures();
    features.forEach(notifyLicensedFeatureUsage);
  };
}

export function addLayerWithoutDataSync(layerDescriptor: LayerDescriptor) {
  return {
    type: ADD_LAYER,
    layer: layerDescriptor,
  };
}

export function addPreviewLayers(layerDescriptors: LayerDescriptor[]) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch(removePreviewLayers());

    layerDescriptors.forEach((layerDescriptor) => {
      dispatch(addLayer({ ...layerDescriptor, __isPreviewLayer: true }));

      // Auto open layer legend to increase legend discoverability
      if (
        layerDescriptor.style &&
        (hasByValueStyling(layerDescriptor.style) ||
          layerDescriptor.style.type === LAYER_STYLE_TYPE.HEATMAP)
      ) {
        dispatch(showTOCDetails(layerDescriptor.id));
      }
    });
  };
}

export function removePreviewLayers() {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    getLayerList(getState()).forEach((layer) => {
      if (layer.isPreviewLayer()) {
        if (isLayerGroup(layer)) {
          dispatch(ungroupLayer(layer.getId()));
        }
        dispatch(removeLayer(layer.getId()));
      }
    });
  };
}

export function promotePreviewLayers() {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    getLayerList(getState()).forEach((layer) => {
      if (layer.isPreviewLayer()) {
        dispatch({
          type: UPDATE_LAYER_PROP,
          id: layer.getId(),
          propName: '__isPreviewLayer',
          newValue: false,
        });
      }
    });
  };
}

export function setLayerVisibility(layerId: string, makeVisible: boolean) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }

    if (isLayerGroup(layer)) {
      layer.getChildren().forEach((childLayer) => {
        dispatch(setLayerVisibility(childLayer.getId(), makeVisible));
      });
    }

    // If the layer visibility is already what we want it to be, do nothing
    if (layer.isVisible() === makeVisible) {
      return;
    }

    dispatch({
      type: SET_LAYER_VISIBILITY,
      layerId,
      visibility: makeVisible,
    });

    // if the current-state is invisible, we also want to sync data
    // e.g. if a layer was invisible at start-up, it won't have any data loaded
    if (makeVisible) {
      dispatch(syncDataForLayerId(layerId, false));
    }
  };
}

export function toggleLayerVisible(layerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }
    const makeVisible = !layer.isVisible();

    dispatch(setLayerVisibility(layerId, makeVisible));
  };
}

export function hideAllLayers() {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    getLayerList(getState()).forEach((layer: ILayer, index: number) => {
      if (!layer.isBasemap(index)) {
        dispatch(setLayerVisibility(layer.getId(), false));
      }
    });
  };
}

export function showAllLayers() {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    getLayerList(getState()).forEach((layer: ILayer, index: number) => {
      dispatch(setLayerVisibility(layer.getId(), true));
    });
  };
}

export function showThisLayerOnly(layerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    getLayerList(getState()).forEach((layer: ILayer, index: number) => {
      if (layer.isBasemap(index) || layer.getId() === layerId) {
        return;
      }

      // hide all other layers
      dispatch(setLayerVisibility(layer.getId(), false));
    });

    // show target layer after hiding all other layers
    // since hiding layer group will hide its children
    const targetLayer = getLayerById(layerId, getState());
    if (targetLayer) {
      dispatch(setLayerVisibility(layerId, true));
    }
  };
}

export function setSelectedLayer(layerId: string | null) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const oldSelectedLayer = getSelectedLayerId(getState());
    if (oldSelectedLayer) {
      await dispatch(rollbackToTrackedLayerStateForSelectedLayer());
    }
    if (layerId) {
      dispatch(trackCurrentLayerState(layerId));
      // Reset draw mode only if setting a new selected layer
      if (getDrawMode(getState()) !== DRAW_MODE.NONE) {
        dispatch(setDrawMode(DRAW_MODE.NONE));
      }
    }
    dispatch({
      type: SET_SELECTED_LAYER,
      selectedLayerId: layerId,
    });
  };
}

export function setFirstPreviewLayerToSelectedLayer() {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const firstPreviewLayer = getLayerList(getState()).find((layer) => {
      return layer.isPreviewLayer();
    });
    if (firstPreviewLayer) {
      dispatch(setSelectedLayer(firstPreviewLayer.getId()));
    }
  };
}

export function updateLayerOrder(newLayerOrder: number[]) {
  return {
    type: UPDATE_LAYER_ORDER,
    newLayerOrder,
  };
}

function updateMetricsProp(layerId: string, value: unknown) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    const previousFields =
      layer && hasVectorLayerMethod(layer, 'getFields') ? await layer.getFields() : [];
    dispatch({
      type: UPDATE_SOURCE_PROP,
      layerId,
      propName: 'metrics',
      value,
    });
    await dispatch(updateStyleProperties(layerId, previousFields as IESAggField[]));
  };
}

function updateSourcePropWithoutSync(
  layerId: string,
  propName: string,
  value: unknown,
  newLayerType?: LAYER_TYPE
) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    if (propName === 'metrics') {
      if (newLayerType) {
        throw new Error('May not change layer-type when modifying metrics source-property');
      }
      return await dispatch(updateMetricsProp(layerId, value));
    }

    dispatch({
      type: UPDATE_SOURCE_PROP,
      layerId,
      propName,
      value,
    });
    if (newLayerType) {
      dispatch(updateLayerType(layerId, newLayerType));
    }

    if (propName === 'scalingType') {
      // get joins from layer descriptor instead of layer.getJoins()
      // 1) IVectorLayer implementations may return empty array when descriptor has joins
      // 2) getJoins returns instances and descriptors are needed.
      const layerDescriptor = getLayerDescriptor(getState(), layerId) as VectorLayerDescriptor;
      const joins = layerDescriptor.joins ? layerDescriptor.joins : [];
      if (value === SCALING_TYPES.CLUSTERS && joins.length) {
        // Blended scaling type does not support joins
        // It is not possible to display join metrics when showing clusters
        dispatch({
          type: SET_JOINS,
          layerId,
          joins: [],
        });
        await dispatch(updateStyleProperties(layerId));
      } else if (value === SCALING_TYPES.MVT) {
        const filteredJoins = joins.filter((joinDescriptor) => {
          return !isSpatialJoin(joinDescriptor);
        });
        // Maplibre feature-state join uses promoteId and there is a limit to one promoteId
        // Therefore, Vector tile scaling supports only one join
        dispatch({
          type: SET_JOINS,
          layerId,
          joins: filteredJoins.length ? [filteredJoins[0]] : [],
        });
        // update style props regardless of updating joins
        // Allow style to clean-up data driven style properties with join fields that do not support feature-state.
        await dispatch(updateStyleProperties(layerId));
      }
    }
  };
}

export function updateSourceProp(
  layerId: string,
  propName: string,
  value: unknown,
  newLayerType?: LAYER_TYPE
) {
  return async (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    await dispatch(updateSourcePropWithoutSync(layerId, propName, value, newLayerType));
    dispatch(syncDataForLayerId(layerId, false));
  };
}

export function updateSourceProps(layerId: string, sourcePropChanges: OnSourceChangeArgs[]) {
  return async (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    // Using for loop to ensure update completes before starting next update
    for (let i = 0; i < sourcePropChanges.length; i++) {
      const { propName, value, newLayerType } = sourcePropChanges[i];
      await dispatch(updateSourcePropWithoutSync(layerId, propName, value, newLayerType));
    }
    dispatch(syncDataForLayerId(layerId, false));
  };
}

function updateLayerType(layerId: string, newLayerType: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (!layer || layer.getType() === newLayerType) {
      return;
    }
    dispatch(clearDataRequests(layer));
    clearInspectorAdapters(layer, getInspectorAdapters(getState()));
    dispatch({
      type: UPDATE_LAYER_PROP,
      id: layerId,
      propName: 'type',
      newValue: newLayerType,
    });
  };
}

export function updateLayerLabel(id: string, newLabel: string) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'label',
    newValue: newLabel,
  };
}

export function updateLayerLocale(id: string, locale: string) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'locale',
    newValue: locale,
  };
}

export function setLayerAttribution(id: string, attribution: Attribution) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'attribution',
    newValue: attribution,
  };
}

export function clearLayerAttribution(id: string) {
  return {
    type: CLEAR_LAYER_PROP,
    id,
    propName: 'attribution',
  };
}

export function updateLayerMinZoom(id: string, minZoom: number) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'minZoom',
    newValue: minZoom,
  };
}

export function updateLayerMaxZoom(id: string, maxZoom: number) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'maxZoom',
    newValue: maxZoom,
  };
}

export function updateLayerAlpha(id: string, alpha: number) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'alpha',
    newValue: alpha,
  };
}

export function updateLabelsOnTop(id: string, areLabelsOnTop: boolean) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'areLabelsOnTop',
    newValue: areLabelsOnTop,
  };
}

export function updateFittableFlag(id: string, includeInFitToBounds: boolean) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'includeInFitToBounds',
    newValue: includeInFitToBounds,
  };
}

export function updateDisableTooltips(id: string, disableTooltips: boolean) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'disableTooltips',
    newValue: disableTooltips,
  };
}

export function setLayerQuery(id: string, query: Query) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch({
      type: UPDATE_LAYER_PROP,
      id,
      propName: 'query',
      newValue: query,
    });

    dispatch(syncDataForLayerId(id, false));
  };
}

export function setLayerParent(id: string, parent: string | undefined) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    dispatch({
      type: UPDATE_LAYER_PROP,
      id,
      propName: 'parent',
      newValue: parent,
    });

    if (parent) {
      // Open parent layer details. Without opening parent details, layer disappears from legend and this confuses users
      dispatch(showTOCDetails(parent));
    }
  };
}

export function removeSelectedLayer() {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const state = getState();
    const layerId = getSelectedLayerId(state);
    if (layerId) {
      dispatch(removeLayer(layerId));
    }
  };
}

export function removeLayer(layerId: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const state = getState();
    const selectedLayerId = getSelectedLayerId(state);
    if (layerId === selectedLayerId) {
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      await dispatch(setSelectedLayer(null));
    }
    dispatch(removeLayerFromLayerList(layerId));
  };
}

function removeLayerFromLayerList(layerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layerGettingRemoved = getLayerById(layerId, getState());
    if (!layerGettingRemoved) {
      return;
    }

    layerGettingRemoved.getInFlightRequestTokens().forEach((requestToken) => {
      dispatch(cancelRequest(requestToken));
    });
    clearInspectorAdapters(layerGettingRemoved, getInspectorAdapters(getState()));
    dispatch({
      type: REMOVE_LAYER,
      id: layerId,
    });
    // Clean up draw state if needed
    const editState = getEditState(getState());
    if (layerId === editState?.layerId) {
      dispatch(setDrawMode(DRAW_MODE.NONE));
    }
    const openTOCDetails = getOpenTOCDetails(getState());
    if (openTOCDetails.includes(layerId)) {
      dispatch(hideTOCDetails(layerId));
    }

    if (isLayerGroup(layerGettingRemoved)) {
      layerGettingRemoved.getChildren().forEach((childLayer) => {
        dispatch(removeLayerFromLayerList(childLayer.getId()));
      });
    }
  };
}

function updateStyleProperties(layerId: string, previousFields?: IField[]) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const targetLayer: ILayer | undefined = getLayerById(layerId, getState());
    if (!targetLayer) {
      return;
    }

    const style = targetLayer!.getCurrentStyle();
    if (!style || style.getType() !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }

    if (!hasVectorLayerMethod(targetLayer, 'getFields')) {
      return;
    }

    const nextFields = await targetLayer.getFields(); // take into account all fields, since labels can be driven by any field (source or join)
    const { hasChanges, nextStyleDescriptor } = await (
      style as IVectorStyle
    ).getDescriptorWithUpdatedStyleProps(nextFields, getMapColors(getState()), previousFields);
    if (hasChanges && nextStyleDescriptor) {
      dispatch(updateLayerStyle(layerId, nextStyleDescriptor));
    }
  };
}

export function updateLayerStyle(layerId: string, styleDescriptor: StyleDescriptor) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch({
      type: UPDATE_LAYER_STYLE,
      layerId,
      style: {
        ...styleDescriptor,
      },
    });

    // Auto open layer legend to increase legend discoverability
    if (hasByValueStyling(styleDescriptor)) {
      dispatch(showTOCDetails(layerId));
    }

    // Ensure updateStyleMeta is triggered
    // syncDataForLayer may not trigger endDataLoad if no re-fetch is required
    dispatch(updateStyleMeta(layerId));

    // Style update may require re-fetch, for example ES search may need to retrieve field used for dynamic styling
    dispatch(syncDataForLayerId(layerId, false));
  };
}

export function updateLayerStyleForSelectedLayer(styleDescriptor: StyleDescriptor) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const selectedLayerId = getSelectedLayerId(getState());
    if (!selectedLayerId) {
      return;
    }
    dispatch(updateLayerStyle(selectedLayerId, styleDescriptor));
  };
}

export function setJoinsForLayer(layer: ILayer, joins: Array<Partial<JoinDescriptor>>) {
  return async (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    const previousFields = hasVectorLayerMethod(layer, 'getFields') ? await layer.getFields() : [];
    dispatch({
      type: SET_JOINS,
      layerId: layer.getId(),
      joins,
    });
    await dispatch(updateStyleProperties(layer.getId(), previousFields));
    dispatch(syncDataForLayerId(layer.getId(), false));
  };
}

export function setHiddenLayers(hiddenLayerIds: string[]) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const isMapReady = getMapReady(getState());

    if (!isMapReady) {
      dispatch({ type: SET_WAITING_FOR_READY_HIDDEN_LAYERS, hiddenLayerIds });
    } else {
      getLayerListRaw(getState()).forEach((layer) =>
        dispatch(setLayerVisibility(layer.id, !hiddenLayerIds.includes(layer.id)))
      );
    }
  };
}

export function setTileState(
  layerId: string,
  areTilesLoaded: boolean,
  tileMetaFeatures?: TileMetaFeature[],
  tileErrors?: TileError[]
) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }

    dispatch({
      type: UPDATE_LAYER_PROP,
      id: layerId,
      propName: '__areTilesLoaded',
      newValue: areTilesLoaded,
    });

    dispatch({
      type: UPDATE_LAYER_PROP,
      id: layerId,
      propName: '__tileErrors',
      newValue: tileErrors,
    });

    if (!isLayerGroup(layer) && isESVectorTileSource(layer.getSource())) {
      getInspectorAdapters(getState()).vectorTiles.setTileResults(
        layerId,
        tileMetaFeatures,
        tileErrors
      );
    }

    if (!tileMetaFeatures && !layer.getDescriptor().__tileMetaFeatures) {
      return;
    }

    dispatch({
      type: UPDATE_LAYER_PROP,
      id: layerId,
      propName: '__tileMetaFeatures',
      newValue: tileMetaFeatures,
    });
    dispatch(updateStyleMeta(layerId));
  };
}

function clearInspectorAdapters(layer: ILayer, adapters: Adapters) {
  if (isLayerGroup(layer)) {
    return;
  }

  if (adapters.vectorTiles) {
    adapters.vectorTiles.removeLayer(layer.getId());
  }

  const source = layer.getSource();
  if ('getInspectorRequestIds' in source) {
    (source as IVectorSource).getInspectorRequestIds().forEach((id) => {
      adapters.requests!.resetRequest(id);
    });
  }

  if (adapters.requests && hasVectorLayerMethod(layer, 'getValidJoins')) {
    layer.getValidJoins().forEach((join) => {
      adapters.requests!.resetRequest(join.getRightJoinSource().getId());
    });
  }
}

function hasByValueStyling(styleDescriptor: StyleDescriptor) {
  return (
    styleDescriptor.type === LAYER_STYLE_TYPE.VECTOR &&
    Object.values((styleDescriptor as VectorStyleDescriptor).properties).some((styleProperty) => {
      return (styleProperty as { type?: STYLE_TYPE })?.type === STYLE_TYPE.DYNAMIC;
    })
  );
}

export function createLayerGroup(draggedLayerId: string, combineLayerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const group = LayerGroup.createDescriptor({});
    const combineLayerDescriptor = getLayerDescriptor(getState(), combineLayerId);
    if (combineLayerDescriptor?.parent) {
      group.parent = combineLayerDescriptor.parent;
    }
    dispatch({
      type: ADD_LAYER,
      layer: group,
    });
    // Move group to left of combine-layer
    dispatch(moveLayerToLeftOfTarget(group.id, combineLayerId));

    dispatch(showTOCDetails(group.id));
    dispatch(setLayerParent(draggedLayerId, group.id));
    dispatch(setLayerParent(combineLayerId, group.id));

    // Move dragged-layer to left of combine-layer
    dispatch(moveLayerToLeftOfTarget(draggedLayerId, combineLayerId));
  };
}

export function ungroupLayer(layerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerList(getState()).find((findLayer) => findLayer.getId() === layerId);
    if (!layer || !isLayerGroup(layer)) {
      return;
    }

    layer.getChildren().forEach((childLayer) => {
      dispatch(setLayerParent(childLayer.getId(), layer.getParent()));
    });
  };
}

export function moveLayerToLeftOfTarget(moveLayerId: string, targetLayerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layers = getLayerList(getState());
    const moveLayerIndex = layers.findIndex((layer) => layer.getId() === moveLayerId);
    const targetLayerIndex = layers.findIndex((layer) => layer.getId() === targetLayerId);
    if (moveLayerIndex === -1 || targetLayerIndex === -1) {
      return;
    }
    const moveLayer = layers[moveLayerIndex];

    const newIndex =
      moveLayerIndex > targetLayerIndex
        ? // When layer is moved to the right, new left sibling index is to the left of destination
          targetLayerIndex + 1
        : // When layer is moved to the left, new left sibling index is the destination index
          targetLayerIndex;
    const newOrder = [];
    for (let i = 0; i < layers.length; i++) {
      newOrder.push(i);
    }
    newOrder.splice(moveLayerIndex, 1);
    newOrder.splice(newIndex, 0, moveLayerIndex);
    dispatch(updateLayerOrder(newOrder));

    if (isLayerGroup(moveLayer)) {
      moveLayer.getChildren().forEach((childLayer) => {
        dispatch(moveLayerToLeftOfTarget(childLayer.getId(), targetLayerId));
      });
    }
  };
}

export function moveLayerToBottom(moveLayerId: string) {
  return (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layers = getLayerList(getState());
    const moveLayerIndex = layers.findIndex((layer) => layer.getId() === moveLayerId);
    if (moveLayerIndex === -1) {
      return;
    }
    const moveLayer = layers[moveLayerIndex];

    const newIndex = 0;
    const newOrder = [];
    for (let i = 0; i < layers.length; i++) {
      newOrder.push(i);
    }
    newOrder.splice(moveLayerIndex, 1);
    newOrder.splice(newIndex, 0, moveLayerIndex);
    dispatch(updateLayerOrder(newOrder));

    if (isLayerGroup(moveLayer)) {
      (moveLayer as LayerGroup).getChildren().forEach((childLayer) => {
        dispatch(moveLayerToBottom(childLayer.getId()));
      });
    }
  };
}
