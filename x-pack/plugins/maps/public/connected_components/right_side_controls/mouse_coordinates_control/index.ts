/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { MouseCoordinatesControl } from './mouse_coordinates_control';
import { getMouseCoordinates, getMapZoom } from '../../../selectors/map_selectors';
import { MapStoreState } from '../../../reducers/store';

function mapStateToProps(state: MapStoreState) {
  return {
    mouseCoordinates: getMouseCoordinates(state),
    zoom: getMapZoom(state),
  };
}

const connected = connect(mapStateToProps, {})(MouseCoordinatesControl);
export { connected as MouseCoordinatesControl };
