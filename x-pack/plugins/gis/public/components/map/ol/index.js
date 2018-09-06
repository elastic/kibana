/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { OLMapContainer } from './view';
import { syncOLState } from "../../../selectors/ol_map_selectors";
import { mapExtentChanged } from '../../../actions/store_actions';

function mapStateToProps(state = {}) {
  return {
    olMap: syncOLState(state)
  };
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

const connectedKibanaMap = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(OLMapContainer);
export { connectedKibanaMap as OLMapContainer };
