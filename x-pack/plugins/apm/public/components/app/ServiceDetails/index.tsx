/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
// @ts-ignore
import { getLicense } from 'x-pack/plugins/apm/public/store/reactReduxRequest/license';
import { hasDynamicBaseline } from 'x-pack/plugins/apm/public/store/reactReduxRequest/transactionOverviewCharts';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { getUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ServiceDetailsView } from './view';

function mapStateToProps(state = {} as IReduxState) {
  return {
    urlParams: getUrlParams(state),
    hasDynamicBaseline: hasDynamicBaseline(state),
    license: getLicense(state)
  };
}

const ServiceDetails = connect(mapStateToProps)(ServiceDetailsView);

export { ServiceDetails };
