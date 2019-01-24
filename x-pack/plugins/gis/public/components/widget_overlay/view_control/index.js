/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ViewControl } from './view_control';
import { getMouseCoordinates } from "../../../selectors/map_selectors";
import {
  getIsSetViewOpen,
  closeSetView,
  openSetView,
} from '../../../store/ui';

function mapStateToProps(state = {}) {
  return {
    isSetViewOpen: getIsSetViewOpen(state),
    mouseCoordinates: getMouseCoordinates(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeSetView: () => {
      dispatch(closeSetView());
    },
    openSetView: () => {
      dispatch(openSetView());
    }
  };
}

const connectedViewControl = connect(mapStateToProps, mapDispatchToProps)(ViewControl);
export { connectedViewControl as ViewControl };
