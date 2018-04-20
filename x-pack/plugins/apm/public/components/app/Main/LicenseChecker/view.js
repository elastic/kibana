/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Component } from 'react';
import { STATUS } from '../../../../constants/index';

function maybeLoadLicense(props) {
  if (!props.license.status) {
    props.loadLicense();
  }
}

class LicenseChecker extends Component {
  componentDidMount() {
    maybeLoadLicense(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (
      nextProps.license.status === STATUS.SUCCESS &&
      !nextProps.license.data.license.isActive
    ) {
      window.location = '#/invalid-license';
    }

    maybeLoadLicense(nextProps);
  }

  render() {
    return null;
  }
}

export default LicenseChecker;
