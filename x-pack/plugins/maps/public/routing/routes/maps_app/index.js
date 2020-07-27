/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MapsAppView } from './maps_app_view';
import { getFlyoutDisplay, getIsFullScreen } from '../../../selectors/ui_selectors';
import {
  getFilters,
  getQueryableUniqueIndexPatternIds,
  getRefreshConfig,
  hasUnsavedChanges,
} from '../../../selectors/map_selectors';
import {
  replaceLayerList,
  setGotoWithCenter,
  setIsLayerTOCOpen,
  setMapSettings,
  setOpenTOCDetails,
  setQuery,
  setReadOnly,
  setRefreshConfig,
  setSelectedLayer,
  updateFlyout,
} from '../../../actions';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { getMapsCapabilities } from '../../../kibana_services';

function mapStateToProps(state = {}) {
  return {
    isFullScreen: getIsFullScreen(state),
    nextIndexPatternIds: getQueryableUniqueIndexPatternIds(state),
    flyoutDisplay: getFlyoutDisplay(state),
    refreshConfig: getRefreshConfig(state),
    filters: getFilters(state),
    hasUnsavedChanges: (savedMap, initialLayerListConfig) => {
      return hasUnsavedChanges(state, savedMap, initialLayerListConfig);
    },
  };
}

function mapDispatchToProps(dispatch) {
  return {
    dispatchSetQuery: (refresh, filters, query, time) => {
      dispatch(
        setQuery({
          filters,
          query,
          timeFilters: time,
          refresh,
        })
      );
    },
    setRefreshConfig: (refreshConfig) => dispatch(setRefreshConfig(refreshConfig)),
    replaceLayerList: (layerList) => dispatch(replaceLayerList(layerList)),
    setGotoWithCenter: (latLonZoom) => dispatch(setGotoWithCenter(latLonZoom)),
    setMapSettings: (mapSettings) => dispatch(setMapSettings(mapSettings)),
    setIsLayerTOCOpen: (isLayerTOCOpen) => dispatch(setIsLayerTOCOpen(isLayerTOCOpen)),
    setOpenTOCDetails: (openTOCDetails) => dispatch(setOpenTOCDetails(openTOCDetails)),
    clearUi: () => {
      dispatch(setSelectedLayer(null));
      dispatch(updateFlyout(FLYOUT_STATE.NONE));
      dispatch(setReadOnly(!getMapsCapabilities().save));
    },
  };
}

const connectedMapsAppView = connect(mapStateToProps, mapDispatchToProps)(MapsAppView);
export { connectedMapsAppView as MapsAppView };
