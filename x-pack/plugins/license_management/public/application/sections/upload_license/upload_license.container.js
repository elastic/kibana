/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { setBreadcrumb } from '../../store/actions/set_breadcrumb';
import { uploadLicense, uploadLicenseStatus } from '../../store/actions/upload_license';
import { addUploadErrorMessage } from '../../store/actions/add_error_message';

import {
  getUploadErrorMessage,
  getLicenseType,
  isInvalid,
  isApplying,
  uploadNeedsAcknowledgement,
  uploadMessages,
} from '../../store/reducers/license_management';
import { UploadLicense as PresentationComponent } from './upload_license';

const mapStateToProps = (state) => {
  return {
    isInvalid: isInvalid(state),
    needsAcknowledgement: uploadNeedsAcknowledgement(state),
    messages: uploadMessages(state),
    errorMessage: getUploadErrorMessage(state),
    applying: isApplying(state),
    currentLicenseType: getLicenseType(state) || '',
  };
};
const mapDispatchToProps = {
  addUploadErrorMessage,
  uploadLicense,
  uploadLicenseStatus,
  setBreadcrumb,
};

export const UploadLicense = connect(mapStateToProps, mapDispatchToProps)(PresentationComponent);
