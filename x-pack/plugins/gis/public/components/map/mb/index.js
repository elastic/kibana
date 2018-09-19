/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { MBMapContainer } from './view';
import { syncMBState } from './mb_map_selector';
import { mapExtentChanged } from '../../../actions/store_actions';


function mapStateToProps(state = {}) {
  /**
   * We're somewhat abusing the reselect framework here.
   * Instead of using selectors to read out and transform state from the store and bind the return of the selector to a property,
   * we are instead using this function as an event-handler, and using the selector to create all the necessary side-effects
   * on the mapbox component.
   */
  syncMBState(state);
  return {};
}

function mapDispatchToProps(dispatch) {
  return {
    extentChanged: (e) => {
      dispatch(mapExtentChanged(e));
    },
    initialize: (e) => {
      dispatch(mapExtentChanged(e));
    }
  };
}

const connectedKibanaMap = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(MBMapContainer);
export { connectedKibanaMap as MBMapContainer };
