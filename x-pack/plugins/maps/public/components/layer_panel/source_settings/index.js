/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { SourceSettings } from './source_settings';
import { getSelectedLayer } from '../../../selectors/map_selectors';
import { updateSourceProp } from '../../../actions/store_actions';

function mapStateToProps(state = {}) {
  return {
    layer: getSelectedLayer(state)
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateSourceProp: (id, propName, value) => dispatch(updateSourceProp(id, propName, value)),
  };
}

const connectedSourceSettings = connect(mapStateToProps, mapDispatchToProps)(SourceSettings);
export { connectedSourceSettings as SourceSettings };
