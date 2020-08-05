/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dispatch } from 'redux';
import { MapStoreState } from '../reducers/store';
import { getFlyoutDisplay } from '../selectors/ui_selectors';
import { FLYOUT_STATE } from '../reducers/ui';
import { trackMapSettings } from './map_actions';
import { setSelectedLayer } from './layer_actions';

export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
export const CLOSE_SET_VIEW = 'CLOSE_SET_VIEW';
export const OPEN_SET_VIEW = 'OPEN_SET_VIEW';
export const SET_IS_LAYER_TOC_OPEN = 'SET_IS_LAYER_TOC_OPEN';
export const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
export const SET_READ_ONLY = 'SET_READ_ONLY';
export const SET_OPEN_TOC_DETAILS = 'SET_OPEN_TOC_DETAILS';
export const SHOW_TOC_DETAILS = 'SHOW_TOC_DETAILS';
export const HIDE_TOC_DETAILS = 'HIDE_TOC_DETAILS';

export function exitFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: false,
  };
}

export function updateFlyout(display: FLYOUT_STATE) {
  return {
    type: UPDATE_FLYOUT,
    display,
  };
}
export function openMapSettings() {
  return (dispatch: Dispatch, getState: () => MapStoreState) => {
    const flyoutDisplay = getFlyoutDisplay(getState());
    if (flyoutDisplay === FLYOUT_STATE.MAP_SETTINGS_PANEL) {
      return;
    }
    dispatch<any>(setSelectedLayer(null));
    dispatch(trackMapSettings());
    dispatch(updateFlyout(FLYOUT_STATE.MAP_SETTINGS_PANEL));
  };
}
export function closeSetView() {
  return {
    type: CLOSE_SET_VIEW,
  };
}
export function openSetView() {
  return {
    type: OPEN_SET_VIEW,
  };
}
export function setIsLayerTOCOpen(isLayerTOCOpen: boolean) {
  return {
    type: SET_IS_LAYER_TOC_OPEN,
    isLayerTOCOpen,
  };
}
export function enableFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: true,
  };
}
export function setReadOnly(isReadOnly: boolean) {
  return {
    type: SET_READ_ONLY,
    isReadOnly,
  };
}

export function setOpenTOCDetails(layerIds?: string[]) {
  return {
    type: SET_OPEN_TOC_DETAILS,
    layerIds,
  };
}

export function showTOCDetails(layerId: string) {
  return {
    type: SHOW_TOC_DETAILS,
    layerId,
  };
}

export function hideTOCDetails(layerId: string) {
  return {
    type: HIDE_TOC_DETAILS,
    layerId,
  };
}
