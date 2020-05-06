/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ViewControl } from './view_control';
import { getMouseCoordinates, getMapZoom } from '../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    mouseCoordinates: getMouseCoordinates(state),
    zoom: getMapZoom(state),
  };
}

const connectedViewControl = connect(mapStateToProps, null)(ViewControl);
export { connectedViewControl as ViewControl };
