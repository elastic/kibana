/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { LayerPanel } from './view';
import { getSelectedLayer } from '../../selectors/map_selectors';
import { updateSourceProp } from '../../actions';

function mapStateToProps(state = {}) {
  const selectedLayer = getSelectedLayer(state);
  return {
    key: selectedLayer ? `${selectedLayer.getId()}${selectedLayer.isJoinable()}` : '',
    selectedLayer,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateSourceProp: (id, propName, value, newLayerType) =>
      dispatch(updateSourceProp(id, propName, value, newLayerType)),
  };
}

const connectedLayerPanel = connect(mapStateToProps, mapDispatchToProps)(LayerPanel);
export { connectedLayerPanel as LayerPanel };
