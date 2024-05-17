/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { AnyAction } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { setGotoWithCenter } from '../../../actions';
import { MapStoreState } from '../../../reducers/store';
import { getMapCenter, getMapSettings, getMapZoom } from '../../../selectors/map_selectors';
import { SetViewControl } from './set_view_control';

function mapStateToProps(state: MapStoreState) {
  return {
    settings: getMapSettings(state),
    zoom: getMapZoom(state),
    center: getMapCenter(state),
  };
}

function mapDispatchToProps(dispatch: ThunkDispatch<MapStoreState, void, AnyAction>) {
  return {
    onSubmit: ({ lat, lon, zoom }: { lat: number; lon: number; zoom: number }) => {
      dispatch(setGotoWithCenter({ lat, lon, zoom }));
    },
  };
}

const connectedSetViewControl = connect(mapStateToProps, mapDispatchToProps)(SetViewControl);
export { connectedSetViewControl as SetViewControl };
