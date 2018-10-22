/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import TransactionsDetails from './view';
import { getUrlParams } from '../../../store/urlParams';
import { ID as v1ID } from '../../../store/reactReduxRequest/waterfallV1';
import { ID as v2ID } from '../../../store/reactReduxRequest/waterfallV2';

function mapStateToProps(state = {}) {
  const waterfall =
    state.reactReduxRequest[v1ID] || state.reactReduxRequest[v2ID];
  return {
    location: state.location,
    urlParams: getUrlParams(state),
    waterfall: waterfall && waterfall.data ? waterfall.data : null
  };
}

const mapDispatchToProps = {};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TransactionsDetails);
