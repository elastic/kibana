/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { IReduxState } from 'x-pack/plugins/apm/public/store/rootReducer';
import { getUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ServiceDetailsView } from './view';

function mapStateToProps(state = {} as IReduxState) {
  return {
    urlParams: getUrlParams(state)
  };
}

const ServiceDetails = connect(mapStateToProps)(ServiceDetailsView);

export { ServiceDetails };
