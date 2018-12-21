/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TransactionDetailsView } from 'x-pack/plugins/apm/public/components/app/TransactionDetails/view';
import { getUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { IReduxState } from '../../../store/rootReducer';

function mapStateToProps(state = {} as IReduxState) {
  return {
    location: state.location,
    urlParams: getUrlParams(state)
  };
}

export const TransactionDetails = connect(mapStateToProps)(
  TransactionDetailsView
);
