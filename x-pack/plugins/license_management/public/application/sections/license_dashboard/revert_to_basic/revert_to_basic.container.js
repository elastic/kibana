/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';

import { cancelStartBasicLicense, startBasicLicense } from '../../../store/actions/start_basic';
import {
  getLicenseType,
  getStartBasicMessages,
  shouldShowRevertToBasicLicense,
  startBasicLicenseNeedsAcknowledgement,
} from '../../../store/reducers/license_management';
import { RevertToBasic as PresentationComponent } from './revert_to_basic';

const mapStateToProps = (state) => {
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
