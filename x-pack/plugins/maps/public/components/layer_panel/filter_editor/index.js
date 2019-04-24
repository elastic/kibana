/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { FilterEditor } from './filter_editor';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { setLayerQuery, setLayerApplyGlobalQuery } from '../../../actions/store_actions';

function mapStateToProps(state = {}) {
  return {
    layer: getSelectedLayer(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setLayerQuery: (layerId, query) => {
      dispatch(setLayerQuery(layerId, query));
    },
    setLayerApplyGlobalQuery: (layerId, applyGlobalQuery) => {
      dispatch(setLayerApplyGlobalQuery(layerId, applyGlobalQuery));
    }
  };
}

const connectedFilterEditor = connect(mapStateToProps, mapDispatchToProps)(FilterEditor);
export { connectedFilterEditor as FilterEditor };
