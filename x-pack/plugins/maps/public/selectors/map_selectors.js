/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { timeFilter } from '../kibana_services';

export const getTooltipState = ({ map }) => {
  return map.tooltipState;
};

export const getMapReady = ({ map }) => map && map.ready;

export const getMapInitError = ({ map }) => map.mapInitError;

export const getGoto = ({ map }) => map && map.goto;

export const getSelectedLayerId = ({ map }) => {
  return !map.selectedLayerId || !map.layerList ? null : map.selectedLayerId;
};

export const getTransientLayerId = ({ map }) => map.__transientLayerId;

export const getLayerListRaw = ({ map }) => (map.layerList ? map.layerList : []);

export const getWaitingForMapReadyLayerListRaw = ({ map }) =>
  map.waitingForMapReadyLayerList ? map.waitingForMapReadyLayerList : [];

export const getScrollZoom = ({ map }) => map.mapState.scrollZoom;

export const isInteractiveDisabled = ({ map }) => map.mapState.disableInteractive;

export const isTooltipControlDisabled = ({ map }) => map.mapState.disableTooltipControl;

export const isToolbarOverlayHidden = ({ map }) => map.mapState.hideToolbarOverlay;

export const isLayerControlHidden = ({ map }) => map.mapState.hideLayerControl;

export const isViewControlHidden = ({ map }) => map.mapState.hideViewControl;

export const getMapExtent = ({ map }) => (map.mapState.extent ? map.mapState.extent : {});

export const getMapBuffer = ({ map }) => (map.mapState.buffer ? map.mapState.buffer : {});

export const getMapZoom = ({ map }) => (map.mapState.zoom ? map.mapState.zoom : 0);

export const getMapCenter = ({ map }) =>
  map.mapState.center ? map.mapState.center : { lat: 0, lon: 0 };

export const getMouseCoordinates = ({ map }) => map.mapState.mouseCoordinates;

export const getTimeFilters = ({ map }) =>
  map.mapState.timeFilters ? map.mapState.timeFilters : timeFilter.getTime();

export const getQuery = ({ map }) => map.mapState.query;

export const getFilters = ({ map }) => map.mapState.filters;

export const isUsingSearch = state => {
  const filters = getFilters(state).filter(filter => !filter.meta.disabled);
  const queryString = _.get(getQuery(state), 'query', '');
  return filters.length || queryString.length;
};

export const getDrawState = ({ map }) => map.mapState.drawState;

export const isDrawingFilter = ({ map }) => {
  return !!map.mapState.drawState;
};

export const getRefreshConfig = ({ map }) => {
  if (map.mapState.refreshConfig) {
    return map.mapState.refreshConfig;
  }

  const refreshInterval = timefilter.getRefreshInterval();
  return {
    isPaused: refreshInterval.pause,
    interval: refreshInterval.value,
  };
};

export const getRefreshTimerLastTriggeredAt = ({ map }) => map.mapState.refreshTimerLastTriggeredAt;
