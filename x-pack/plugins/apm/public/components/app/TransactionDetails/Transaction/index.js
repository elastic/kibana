/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import Transaction from './view';
import { getUrlParams } from '../../../../store/urlParams';
import { loadTransaction, getTransaction } from '../../../../store/transaction';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    transaction: getTransaction(state),
    location: state.location
  };
}

const mapDispatchToProps = {
  loadTransaction
};
export default connect(mapStateToProps, mapDispatchToProps)(Transaction);
