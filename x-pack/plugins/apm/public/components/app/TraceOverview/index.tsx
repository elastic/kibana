/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { IReduxState } from '../../../store/rootReducer';
// @ts-ignore
import { getUrlParams } from '../../../store/urlParams';
import { TraceOverview as View } from './view';

function mapStateToProps(state = {} as IReduxState) {
  return {
    urlParams: getUrlParams(state)
  };
}

export const TraceOverview = connect(mapStateToProps)(View);
