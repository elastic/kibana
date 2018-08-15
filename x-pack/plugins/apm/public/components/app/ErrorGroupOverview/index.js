/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import ErrorGroupOverview from './view';
import { getUrlParams } from '../../../store/urlParams';
import { getLicense } from '../../../store/reactReduxRequest/license';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    location: state.location,
    license: getLicense(state)
  };
}

const mapDispatchToProps = {};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ErrorGroupOverview);
