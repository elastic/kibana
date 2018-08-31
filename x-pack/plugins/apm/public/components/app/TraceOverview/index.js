/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { TraceOverview } from './view';
import { selectTraceList } from '../../../store/reactReduxRequest/traceList';
import { getUrlParams } from '../../../store/urlParams';

function mapStateToProps(state = {}) {
  return {
    traceList: selectTraceList(state),
    urlParams: getUrlParams(state)
  };
}

export default connect(mapStateToProps)(TraceOverview);
