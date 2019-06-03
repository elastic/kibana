/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
export const CLOSE_SET_VIEW = 'CLOSE_SET_VIEW';
export const OPEN_SET_VIEW = 'OPEN_SET_VIEW';
export const SET_IS_LAYER_TOC_OPEN = 'SET_IS_LAYER_TOC_OPEN';
export const SET_FULL_SCREEN = 'SET_FULL_SCREEN';
export const SET_READ_ONLY = 'SET_READ_ONLY';
export const SET_FILTERABLE = 'IS_FILTERABLE';
export const SET_OPEN_TOC_DETAILS = 'SET_OPEN_TOC_DETAILS';
export const SHOW_TOC_DETAILS = 'SHOW_TOC_DETAILS';
export const HIDE_TOC_DETAILS = 'HIDE_TOC_DETAILS';

export const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};

export const DEFAULT_IS_LAYER_TOC_OPEN = true;

const INITIAL_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  isFullScreen: false,
  isReadOnly: false,
  isLayerTOCOpen: DEFAULT_IS_LAYER_TOC_OPEN,
  isFilterable: false,
  // storing TOC detail visibility outside of map.layerList because its UI state and not map rendering state.
  // This also makes for easy read/write access for embeddables.
  openTOCDetails: [],
};

// Reducer
export function ui(state = INITIAL_STATE, action) {
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
    case SET_FILTERABLE:
      return { ...state, isFilterable: action.isFilterable };
    case SET_OPEN_TOC_DETAILS:
      return { ...state, openTOCDetails: action.layerIds };
    case SHOW_TOC_DETAILS:
      return {
        ...state,
        openTOCDetails: [
          ...state.openTOCDetails,
          action.layerId
        ]
      };
    case HIDE_TOC_DETAILS:
      return {
        ...state,
        openTOCDetails: state.openTOCDetails.filter(layerId => {
          return layerId !== action.layerId;
        })
      };
    default:
      return state;
  }
}

// Actions
export function updateFlyout(display) {
  return {
    type: UPDATE_FLYOUT,
    display
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
export function setIsLayerTOCOpen(isLayerTOCOpen) {
  return {
    type: SET_IS_LAYER_TOC_OPEN,
    isLayerTOCOpen
  };
}
export function exitFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: false
  };
}
export function enableFullScreen() {
  return {
    type: SET_FULL_SCREEN,
    isFullScreen: true
  };
}
export function setReadOnly(isReadOnly) {
  return {
    type: SET_READ_ONLY,
    isReadOnly
  };
}

export function setFilterable(isFilterable) {
  return {
    type: SET_FILTERABLE,
    isFilterable
  };
}

export function setOpenTOCDetails(layerIds) {
  return {
    type: SET_OPEN_TOC_DETAILS,
    layerIds
  };
}

export function showTOCDetails(layerId) {
  return {
    type: SHOW_TOC_DETAILS,
    layerId
  };
}

export function hideTOCDetails(layerId) {
  return {
    type: HIDE_TOC_DETAILS,
    layerId
  };
}

// Selectors
export const getFlyoutDisplay = ({ ui }) => ui && ui.flyoutDisplay
  || INITIAL_STATE.flyoutDisplay;
export const getIsSetViewOpen = ({ ui }) => ui.isSetViewOpen;
export const getIsLayerTOCOpen = ({ ui }) => ui.isLayerTOCOpen;
export const getOpenTOCDetails = ({ ui }) => ui.openTOCDetails;
export const getIsFullScreen = ({ ui }) => ui.isFullScreen;
export const getIsReadOnly = ({ ui }) => ui.isReadOnly;
export const getIsFilterable = ({ ui }) => ui.isFilterable;
