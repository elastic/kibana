/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { SetViewControl } from './set_view_control';
import { setGotoWithCenter, closeSetView, openSetView } from '../../../actions';
import { getMapZoom, getMapCenter, getMapSettings } from '../../../selectors/map_selectors';
import { getIsSetViewOpen } from '../../../selectors/ui_selectors';

function mapStateToProps(state = {}) {
  return {
    settings: getMapSettings(state),
    isSetViewOpen: getIsSetViewOpen(state),
    zoom: getMapZoom(state),
    center: getMapCenter(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onSubmit: ({ lat, lon, zoom }) => {
      dispatch(closeSetView());
      dispatch(setGotoWithCenter({ lat, lon, zoom }));
    },
    closeSetView: () => {
      dispatch(closeSetView());
    },
    openSetView: () => {
      dispatch(openSetView());
    },
  };
}

const connectedSetViewControl = connect(mapStateToProps, mapDispatchToProps)(SetViewControl);
export { connectedSetViewControl as SetViewControl };
