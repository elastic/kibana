/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, some } from 'lodash';
import { connect } from 'react-redux';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { STATUS } from '../../../../constants/index';
import { GlobalProgressView } from './view';

function getIsLoading(state: IReduxState) {
  return some(
    state.reactReduxRequest,
    subState => get(subState, 'status') === STATUS.LOADING
  );
}

function mapStateToProps(state = {} as IReduxState) {
  return {
    isLoading: getIsLoading(state)
  };
}

export const GlobalProgress = connect(mapStateToProps)(GlobalProgressView);
