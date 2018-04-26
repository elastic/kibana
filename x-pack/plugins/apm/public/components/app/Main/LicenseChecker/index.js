/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import LicenseChecker from './view';
import { loadLicense } from '../../../../store/license';

function mapStateToProps(state = {}) {
  return {
    license: state.license
  };
}

const mapDispatchToProps = {
  loadLicense
};
export default connect(mapStateToProps, mapDispatchToProps)(LicenseChecker);
