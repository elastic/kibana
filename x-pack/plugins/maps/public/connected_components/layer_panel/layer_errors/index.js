/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { LayerErrors } from './layer_errors';
import { getSelectedLayer } from '../../../selectors/map_selectors';

function mapStateToProps(state = {}) {
  return {
    layer: getSelectedLayer(state),
  };
}

const connectedLayerErrors = connect(mapStateToProps, null)(LayerErrors);
export { connectedLayerErrors as LayerErrors };
