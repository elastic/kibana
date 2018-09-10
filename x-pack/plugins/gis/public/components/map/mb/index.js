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
  return {
    mbMap: syncMBState(state)
  };
}

function mapDispatchToProps(dispatch) {
  return {
    extentChanged: () => {
      console.warn('etentChanged not implemented');
    },
    initialize: (e) => {
      dispatch(mapExtentChanged(e));
    }
  };
}

const connectedKibanaMap = connect(mapStateToProps, mapDispatchToProps, null,
  { withRef: true })(MBMapContainer);
export { connectedKibanaMap as MBMapContainer };
