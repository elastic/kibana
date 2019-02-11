/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { SetView } from './set_view';
import { setGotoWithCenter } from '../../../../actions/store_actions';
import { getMapZoom, getMapCenter } from "../../../../selectors/map_selectors";
import { closeSetView } from '../../../../store/ui';

function mapStateToProps(state = {}) {
  return {
    zoom: getMapZoom(state),
    center: getMapCenter(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onSubmit: ({ lat, lon, zoom }) => {
      dispatch(closeSetView());
      dispatch(setGotoWithCenter({ lat, lon, zoom }));
    }
  };
}

const connectedSetView = connect(mapStateToProps, mapDispatchToProps, null, { withRef: true })(SetView);
export { connectedSetView as SetView };
