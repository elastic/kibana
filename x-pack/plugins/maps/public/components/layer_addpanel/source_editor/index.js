/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import { connect } from 'react-redux';
import { SourceEditor } from './view';
import {
  setSelectedLayer,
  removeTransientLayer,
  clearTransientLayerStateAndCloseFlyout,
} from '../../../actions/store_actions';
import { getInspectorAdapters } from '../../../store/non_serializable_instances';

function mapStateToProps(state = {}) {
  return {
    inspectorAdapters: getInspectorAdapters(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    closeFlyout: () => dispatch(clearTransientLayerStateAndCloseFlyout()),
    removeTransientLayer: () => {
      dispatch(setSelectedLayer(null));
      dispatch(removeTransientLayer());
    },
  };
}

const connectedFlyOut = connect(mapStateToProps, mapDispatchToProps)(SourceEditor);
export { connectedFlyOut as SourceEditor };

