/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { GisMap } from './view';
import { getFlyoutDisplay, FLYOUT_STATE, setRefresh } from '../../store/ui';
import { setTimeFiltersToKbnGlobalTime, refreshLayers } from '../../actions/store_actions';

function mapStateToProps(state = {}) {
  const flyoutDisplay = getFlyoutDisplay(state);
  return {
    layerDetailsVisible: flyoutDisplay === FLYOUT_STATE.LAYER_PANEL,
    addLayerVisible: flyoutDisplay === FLYOUT_STATE.ADD_LAYER_WIZARD,
    noFlyoutVisible: flyoutDisplay === FLYOUT_STATE.NONE
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setTimeFiltersToKbnGlobalTime: () => dispatch(setTimeFiltersToKbnGlobalTime()),
    refreshLayers: () => dispatch(refreshLayers()),
    setRefresh: (({ isPaused, interval }) => dispatch(setRefresh({ isPaused, interval }))),
  };
}

const connectedGisMap = connect(mapStateToProps, mapDispatchToProps)(GisMap);
export { connectedGisMap as GisMap };
