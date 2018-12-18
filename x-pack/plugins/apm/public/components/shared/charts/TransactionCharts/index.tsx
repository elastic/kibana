/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { selectHasMLJob } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { selectIsMLAvailable } from 'x-pack/plugins/apm/public/store/selectors/license';
import { TransactionChartsView } from './view';

const mapStateToProps = (state: IReduxState) => ({
  mlAvailable: selectIsMLAvailable(state),
  hasMLJob: selectHasMLJob(state)
});

export const TransactionCharts = connect(mapStateToProps)(
  TransactionChartsView
);
