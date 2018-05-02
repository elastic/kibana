/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import ServiceOverview from './view';
import { loadServiceList, getServiceList } from '../../../store/serviceList';
import { getUrlParams } from '../../../store/urlParams';
import sorting, { changeServiceSorting } from '../../../store/sorting';

function mapStateToProps(state = {}) {
  return {
    serviceList: getServiceList(state),
    urlParams: getUrlParams(state),
    serviceSorting: sorting(state, 'service').sorting.service
  };
}

const mapDispatchToProps = {
  loadServiceList,
  changeServiceSorting
};
export default connect(mapStateToProps, mapDispatchToProps)(ServiceOverview);
