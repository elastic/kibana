/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { getServiceList } from 'x-pack/plugins/apm/public/store/reactReduxRequest/serviceList';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { getUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ServiceOverview as View } from './view';

function mapStateToProps(state = {} as IReduxState) {
  return {
    serviceList: getServiceList(state),
    urlParams: getUrlParams(state)
  };
}

export const ServiceOverview = connect(mapStateToProps)(View);
