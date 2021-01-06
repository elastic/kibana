/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ScaleControl } from './scale_control';

function mapStateToProps() {
  return {};
}

const connectedComponent = connect(mapStateToProps, null)(ScaleControl);
export { connectedComponent as ScaleControl };
