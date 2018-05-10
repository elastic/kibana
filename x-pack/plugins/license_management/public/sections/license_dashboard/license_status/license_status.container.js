/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseStatus as PresentationComponent } from './license_status';
import { connect } from 'react-redux';
import { getLicense, getExpirationDateFormatted, isExpired } from '../../../store/reducers/licenseManagement';

const mapStateToProps = (state) => {
  const { isActive, type } = getLicense(state);
  const typeTitleCase = type.charAt(0).toUpperCase() + type.substr(1).toLowerCase();
  return {
    status: isActive ? 'Active' : 'Inactive',
    type: typeTitleCase,
    isExpired: isExpired(state),
    expiryDate: getExpirationDateFormatted(state)
  };
};

export const LicenseStatus = connect(mapStateToProps)(PresentationComponent);
