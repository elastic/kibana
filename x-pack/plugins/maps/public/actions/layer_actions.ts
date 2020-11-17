/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { Query } from 'src/plugins/data/public';
import { MapStoreState } from '../reducers/store';
import {
  getLayerById,
  getLayerList,
  getLayerListRaw,
  getSelectedLayerId,
  getMapReady,
  getMapColors,
  createLayerInstance,
} from '../selectors/map_selectors';
import { FLYOUT_STATE } from '../reducers/ui';
import { cancelRequest } from '../reducers/non_serializable_instances';
import { updateFlyout } from './ui_actions';
import {
  ADD_LAYER,
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  REMOVE_LAYER,
  REMOVE_TRACKED_LAYER_STATE,
  ROLLBACK_TO_TRACKED_LAYER_STATE,
  SET_JOINS,
  SET_LAYER_VISIBILITY,
  SET_SELECTED_LAYER,
  SET_WAITING_FOR_READY_HIDDEN_LAYERS,
  TRACK_CURRENT_LAYER_STATE,
  UPDATE_LAYER_ORDER,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE,
  UPDATE_SOURCE_PROP,
} from './map_action_constants';
import { clearDataRequests, syncDataForLayerId, updateStyleMeta } from './data_request_actions';
import { cleanTooltipStateForLayer } from './tooltip_actions';
import { JoinDescriptor, LayerDescriptor, StyleDescriptor } from '../../common/descriptor_types';
import { ILayer } from '../classes/layers/layer';
import { IVectorLayer } from '../classes/layers/vector_layer/vector_layer';
import { LAYER_STYLE_TYPE, LAYER_TYPE } from '../../common/constants';
import { IVectorStyle } from '../classes/styles/vector/vector_style';
import { notifyLicensedFeatureUsage } from '../licensed_features';
import { IVectorSource } from '../classes/sources/vector_source';
import { IESSource } from '../classes/sources/es_source';
import { IESAggSource } from '../classes/sources/es_agg_source';
import { IESAggField } from '../classes/fields/agg';

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

    dispatch(syncDataForLayerId(layerId));
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

export function cloneLayer(layerId: string) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const layer = getLayerById(layerId, getState());
    if (!layer) {
      return;
    }

    const clonedDescriptor = await layer.cloneDescriptor();
    dispatch(addLayer(clonedDescriptor));
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
    dispatch(syncDataForLayerId(layerDescriptor.id));

    const layer = createLayerInstance(layerDescriptor);
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
    // if the current-state is invisible, we also want to sync data
    // e.g. if a layer was invisible at start-up, it won't have any data loaded
    const layer = getLayerById(layerId, getState());

    // If the layer visibility is already what we want it to be, do nothing
    if (!layer || layer.isVisible() === makeVisible) {
      return;
    }

    if (!makeVisible) {
      dispatch(cleanTooltipStateForLayer(layerId));
    }

    dispatch({
      type: SET_LAYER_VISIBILITY,
      layerId,
      visibility: makeVisible,
    });
    if (makeVisible) {
      dispatch(syncDataForLayerId(layerId));
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

export function updateSourceProp(
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
      const layer = getLayerById(layerId, getState());
      const oldFields = await (layer as IVectorLayer).getFields();
      dispatch({
        type: UPDATE_SOURCE_PROP,
        layerId,
        propName,
        value,
      });
      if (newLayerType) {
        dispatch(updateLayerType(layerId, newLayerType));
      }
      await dispatch(updateStyleProperties(layerId, oldFields));
      dispatch(syncDataForLayerId(layerId));
    } else {
      dispatch({
        type: UPDATE_SOURCE_PROP,
        layerId,
        propName,
        value,
      });
      if (newLayerType) {
        dispatch(updateLayerType(layerId, newLayerType));
      }
      await dispatch(updateStyleProperties(layerId));
      dispatch(syncDataForLayerId(layerId));
    }
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

export function setLayerQuery(id: string, query: Query) {
  return (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    dispatch({
      type: UPDATE_LAYER_PROP,
      id,
      propName: 'query',
      newValue: query,
    });

    dispatch(syncDataForLayerId(id));
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
    dispatch(cleanTooltipStateForLayer(layerId));
    layerGettingRemoved.destroy();
    dispatch({
      type: REMOVE_LAYER,
      id: layerId,
    });
  };
}

export function updateStyleProperties(layerId: string, oldFields: IESAggField[]) {
  return async (
    dispatch: ThunkDispatch<MapStoreState, void, AnyAction>,
    getState: () => MapStoreState
  ) => {
    const targetLayer = getLayerById(layerId, getState());
    if (!targetLayer || !('getFields' in targetLayer)) {
      return;
    }

    const style = targetLayer!.getCurrentStyle();
    if (!style || style.getType() !== LAYER_STYLE_TYPE.VECTOR) {
      return;
    }

    const nextFields = await (targetLayer as IVectorLayer).getFields(); // take into account all fields, since labels can be driven by any field (source or join)
    const {
      hasChanges,
      nextStyleDescriptor,
    } = await (style as IVectorStyle).getDescriptorWithUpdatedStyleProps(
      nextFields as IESAggField[],
      getMapColors(getState()),
      oldFields
    );
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

    // Ensure updateStyleMeta is triggered
    // syncDataForLayer may not trigger endDataLoad if no re-fetch is required
    dispatch(updateStyleMeta(layerId));

    // Style update may require re-fetch, for example ES search may need to retrieve field used for dynamic styling
    dispatch(syncDataForLayerId(layerId));
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

export function setJoinsForLayer(layer: ILayer, joins: JoinDescriptor[]) {
  return async (dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) => {
    await dispatch({
      type: SET_JOINS,
      layer,
      joins,
    });

    await dispatch(updateStyleProperties(layer.getId()));
    dispatch(syncDataForLayerId(layer.getId()));
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
