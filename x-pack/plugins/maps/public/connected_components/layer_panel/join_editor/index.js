/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { JoinEditor } from './view';
import {
  getSelectedLayer,
  getSelectedLayerJoinDescriptors,
} from '../../../selectors/map_selectors';
import { setJoinsForLayer } from '../../../actions/map_actions';

function mapDispatchToProps(dispatch) {
  return {
    onChange: (layer, joins) => {
      dispatch(setJoinsForLayer(layer, joins));
    },
  };
}

function mapStateToProps(state = {}) {
  return {
    joins: getSelectedLayerJoinDescriptors(state),
    layer: getSelectedLayer(state),
  };
}

const connectedJoinEditor = connect(mapStateToProps, mapDispatchToProps)(JoinEditor);
export { connectedJoinEditor as JoinEditor };
