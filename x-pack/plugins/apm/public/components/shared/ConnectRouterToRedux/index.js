/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import view from './view';
import { updateLocation } from '../../../store/location';

const mapDispatchToProps = {
  updateLocation
};
export default connect(null, mapDispatchToProps)(view);
