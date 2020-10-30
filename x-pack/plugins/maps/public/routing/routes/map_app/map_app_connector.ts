/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { AnyAction } from 'redux';
import { Filter, Query, TimeRange } from 'src/plugins/data/public';
import { MapApp } from './map_app';
import { getFlyoutDisplay, getIsFullScreen } from '../../../selectors/ui_selectors';
import {
  getFilters,
  getQuery,
  getQueryableUniqueIndexPatternIds,
  getRefreshConfig,
  getTimeFilters,
  hasDirtyState,
  getLayerListConfigOnly,
} from '../../../selectors/map_selectors';
import {
  replaceLayerList,
  setGotoWithCenter,
  setIsLayerTOCOpen,
  setMapSettings,
  setOpenTOCDetails,
  setQuery,
  setRefreshConfig,
  enableFullScreen,
  openMapSettings,
} from '../../../actions';
import { FLYOUT_STATE } from '../../../reducers/ui';
import { getMapsCapabilities } from '../../../kibana_services';
import { getInspectorAdapters } from '../../../reducers/non_serializable_instances';
import { MapStoreState } from '../../../reducers/store';
import {
  MapRefreshConfig,
  MapCenterAndZoom,
  LayerDescriptor,
} from '../../../../common/descriptor_types';
import { MapSettings } from '../../../reducers/map';

function mapStateToProps(state: MapStoreState) {
  return {
    isFullScreen: getIsFullScreen(state),
    isOpenSettingsDisabled: getFlyoutDisplay(state) !== FLYOUT_STATE.NONE,
    isSaveDisabled: hasDirtyState(state),
    inspectorAdapters: getInspectorAdapters(state),
    nextIndexPatternIds: getQueryableUniqueIndexPatternIds(state),
    flyoutDisplay: getFlyoutDisplay(state),
    refreshConfig: getRefreshConfig(state),
    filters: getFilters(state),
    layerListConfigOnly: getLayerListConfigOnly(state),
    query: getQuery(state),
    timeFilters: getTimeFilters(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    dispatchSetQuery: ({
      forceRefresh,
      filters,
      query,
      timeFilters,
    }: {
      filters?: Filter[];
      query?: Query;
      timeFilters?: TimeRange;
      forceRefresh?: boolean;
    }) => {
      dispatch(
        setQuery({
          filters,
          query,
          timeFilters,
          forceRefresh,
        })
      );
    },
    setRefreshConfig: (refreshConfig: MapRefreshConfig) =>
      dispatch(setRefreshConfig(refreshConfig)),
    replaceLayerList: (layerList: LayerDescriptor[]) => dispatch(replaceLayerList(layerList)),
    setGotoWithCenter: (latLonZoom: MapCenterAndZoom) => dispatch(setGotoWithCenter(latLonZoom)),
    setMapSettings: (mapSettings: MapSettings) => dispatch(setMapSettings(mapSettings)),
    setIsLayerTOCOpen: (isLayerTOCOpen: boolean) => dispatch(setIsLayerTOCOpen(isLayerTOCOpen)),
    setOpenTOCDetails: (openTOCDetails: string[]) => dispatch(setOpenTOCDetails(openTOCDetails)),
    enableFullScreen: () => dispatch(enableFullScreen()),
    openMapSettings: () => dispatch(openMapSettings()),
  };
}

const connectedComponent = connect(mapStateToProps, mapDispatchToProps)(MapApp);
export { connectedComponent as MapApp };
