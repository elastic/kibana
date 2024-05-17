/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { MapStoreState } from '../../../reducers/store';
import { getMapZoom, getMouseCoordinates } from '../../../selectors/map_selectors';
import { MouseCoordinatesControl } from './mouse_coordinates_control';

function mapStateToProps(state: MapStoreState) {
  return {
    mouseCoordinates: getMouseCoordinates(state),
    zoom: getMapZoom(state),
  };
}

const connected = connect(mapStateToProps, {})(MouseCoordinatesControl);
export { connected as MouseCoordinatesControl };
