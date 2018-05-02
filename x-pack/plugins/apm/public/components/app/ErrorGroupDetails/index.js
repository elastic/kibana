/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import ErrorGroupDetails from './view';
import { getUrlParams } from '../../../store/urlParams';
import { getErrorGroup, loadErrorGroup } from '../../../store/errorGroup';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    errorGroup: getErrorGroup(state),
    location: state.location
  };
}

const mapDispatchToProps = {
  loadErrorGroup
};

export default connect(mapStateToProps, mapDispatchToProps)(ErrorGroupDetails);
