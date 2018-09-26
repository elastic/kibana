/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { JoinEditor } from './view';

function mapDispatchToProps() {
  return {};
}

function mapStateToProps({}, props) {
  return {
    layer: props.layer
  };
}

const connectedJoinEditor = connect(mapStateToProps, mapDispatchToProps)(JoinEditor);
export { connectedJoinEditor as JoinEditor };
