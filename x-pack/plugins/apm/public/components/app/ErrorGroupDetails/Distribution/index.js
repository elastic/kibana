/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import Distribution from './view';
import { getUrlParams } from '../../../../store/urlParams';
import {
  loadErrorDistribution,
  getErrorDistribution
} from '../../../../store/errorDistribution';

function mapStateToProps(state = {}) {
  return {
    urlParams: getUrlParams(state),
    distribution: getErrorDistribution(state)
  };
}

const mapDispatchToProps = {
  loadErrorDistribution
};
export default connect(mapStateToProps, mapDispatchToProps)(Distribution);
