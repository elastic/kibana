/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { RevertToBasic as PresentationComponent } from './revert_to_basic';
import {
  startBasicLicenseNeedsAcknowledgement,
  getLicenseType,
  shouldShowRevertToBasicLicense,
  getStartBasicMessages,
} from '../../../store/reducers/license_management';
import { startBasicLicense, cancelStartBasicLicense } from '../../../store/actions/start_basic';

const mapStateToProps = state => {
  return {
    shouldShowRevertToBasicLicense: shouldShowRevertToBasicLicense(state),
    licenseType: getLicenseType(state),
    needsAcknowledgement: startBasicLicenseNeedsAcknowledgement(state),
    messages: getStartBasicMessages(state),
  };
};

const mapDispatchToProps = {
  startBasicLicense,
  cancelStartBasicLicense,
};

export const RevertToBasic = connect(mapStateToProps, mapDispatchToProps)(PresentationComponent);
