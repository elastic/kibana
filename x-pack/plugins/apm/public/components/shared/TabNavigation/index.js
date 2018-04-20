/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import TabNavigation from './view';

import { getUrlParams } from '../../../store/urlParams';

function mapStateToProps(state = {}) {
  return {
    location: state.location,
    urlParams: getUrlParams(state)
  };
}

const mapDispatchToProps = {};
export default connect(mapStateToProps, mapDispatchToProps)(TabNavigation);
