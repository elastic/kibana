/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ClientFileCreateSourceEditor } from './create_client_file_source_editor';
import { setSelectedLayer, removeTransientLayer } from
  '../../../../../actions/store_actions';

function mapDispatchToProps(dispatch) {
  return {
    removeTransientLayer: () => {
      dispatch(setSelectedLayer(null));
      dispatch(removeTransientLayer());
    },
  };
}

const connectedClientFileCreateSourceEditor = connect(null, mapDispatchToProps)(ClientFileCreateSourceEditor);
export { connectedClientFileCreateSourceEditor as ClientFileCreateSourceEditor };
