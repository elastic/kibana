/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MBMapContainer } from './view';
import { mapExtentChanged, mapReady, mapDestroyed } from '../../../actions/store_actions';
import { getLayerList, getMapState, getMapReady } from "../../../selectors/map_selectors";

function mapStateToProps(state = {}) {
  return {
    isMapReady: getMapReady(state),
    mapState: getMapState(state),
    layerList: getLayerList(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    extentChanged: (e) => {
      dispatch(mapExtentChanged(e));
    },
    onMapReady: (e) => {
      dispatch(mapExtentChanged(e));
      dispatch(mapReady());
    },
    onMapDestroyed: () => {
      dispatch(mapDestroyed());
    }
  };
}

const connectedMBMapContainer = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(MBMapContainer);
export { connectedMBMapContainer as MBMapContainer };
