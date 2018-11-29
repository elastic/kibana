/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { ServiceOverview as View } from './view';
import { getServiceList } from '../../../store/reactReduxRequest/serviceList';
import { getUrlParams } from '../../../store/urlParams';

function mapStateToProps(state = {}) {
  return {
    serviceList: getServiceList(state),
    urlParams: getUrlParams(state)
  };
}

const mapDispatchToProps = {};
export const ServiceOverview = connect(
  mapStateToProps,
  mapDispatchToProps
)(View);
