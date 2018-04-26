/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import view from './view';
import { some, get } from 'lodash';
import { STATUS } from '../../../../constants/index';

function getIsLoading(state) {
  return some(state, subState => get(subState, 'status') === STATUS.LOADING);
}

function mapStateToProps(state = {}) {
  return {
    isLoading: getIsLoading(state)
  };
}

export default connect(mapStateToProps)(view);
