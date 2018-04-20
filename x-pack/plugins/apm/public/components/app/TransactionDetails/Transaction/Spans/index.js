/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import Spans from './view';
import { getUrlParams } from '../../../../../store/urlParams';
import { loadSpans, getSpans } from '../../../../../store/spans';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    spans: getSpans(state),
    location: state.location
  };
}

const mapDispatchToProps = {
  loadSpans
};
export default connect(mapStateToProps, mapDispatchToProps)(Spans);
