/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import {
  UPDATE_FLYOUT,
  CLOSE_SET_VIEW,
  OPEN_SET_VIEW,
  SET_IS_LAYER_TOC_OPEN,
  SET_FULL_SCREEN,
  SET_READ_ONLY,
  SET_OPEN_TOC_DETAILS,
  SHOW_TOC_DETAILS,
  HIDE_TOC_DETAILS,
} from '../actions';

export enum FLYOUT_STATE {
  NONE = 'NONE',
  LAYER_PANEL = 'LAYER_PANEL',
  ADD_LAYER_WIZARD = 'ADD_LAYER_WIZARD',
  MAP_SETTINGS_PANEL = 'MAP_SETTINGS_PANEL',
}

export type MapUiState = {
  flyoutDisplay: FLYOUT_STATE;
  isFullScreen: boolean;
  isReadOnly: boolean;
  isLayerTOCOpen: boolean;
  isSetViewOpen: boolean;
  openTOCDetails: string[];
};

export const DEFAULT_IS_LAYER_TOC_OPEN = true;

export const DEFAULT_MAP_UI_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  isFullScreen: false,
  isReadOnly: false,
  isLayerTOCOpen: DEFAULT_IS_LAYER_TOC_OPEN,
  isSetViewOpen: false,
  // storing TOC detail visibility outside of map.layerList because its UI state and not map rendering state.
  // This also makes for easy read/write access for embeddables.
  openTOCDetails: [],
};

// Reducer
export function ui(state: MapUiState = DEFAULT_MAP_UI_STATE, action: any) {
  switch (action.type) {
    case UPDATE_FLYOUT:
      return { ...state, flyoutDisplay: action.display };
    case CLOSE_SET_VIEW:
      return { ...state, isSetViewOpen: false };
    case OPEN_SET_VIEW:
      return { ...state, isSetViewOpen: true };
    case SET_IS_LAYER_TOC_OPEN:
      return { ...state, isLayerTOCOpen: action.isLayerTOCOpen };
    case SET_FULL_SCREEN:
      return { ...state, isFullScreen: action.isFullScreen };
    case SET_READ_ONLY:
      return { ...state, isReadOnly: action.isReadOnly };
    case SET_OPEN_TOC_DETAILS:
      return { ...state, openTOCDetails: action.layerIds };
    case SHOW_TOC_DETAILS:
      return {
        ...state,
        openTOCDetails: [...state.openTOCDetails, action.layerId],
      };
    case HIDE_TOC_DETAILS:
      return {
        ...state,
        openTOCDetails: state.openTOCDetails.filter((layerId) => {
          return layerId !== action.layerId;
        }),
      };
    default:
      return state;
  }
}
