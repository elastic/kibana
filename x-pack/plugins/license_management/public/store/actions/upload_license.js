/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { addLicense } from '../actions/add_license';
import { BASE_PATH } from '../../../common/constants/base_path';
import { putLicense } from '../../lib/es';
import { addUploadErrorMessage } from "./add_error_message";

export const uploadLicenseStatus = createAction('LICENSE_MANAGEMENT_UPLOAD_LICENSE_STATUS');

const genericUploadError = 'Error encountered uploading license:';

const dispatchFromResponse = async (response, dispatch, currentLicenseType, newLicenseType, { xPackInfo, kbnUrl }) => {
  const { error, acknowledged, license_status: licenseStatus, acknowledge } = response;
  if (error) {
    dispatch(uploadLicenseStatus({}));
    dispatch(addUploadErrorMessage(`${genericUploadError} ${error.reason}`));
  } else if (acknowledged) {
    if (licenseStatus === 'invalid') {
      dispatch(uploadLicenseStatus({}));
      dispatch(addUploadErrorMessage('The supplied license is not valid for this product.'));
    } else if (licenseStatus === 'expired') {
      dispatch(uploadLicenseStatus({}));
      dispatch(addUploadErrorMessage('The supplied license has expired.'));
    } else {
      await xPackInfo.refresh();
      dispatch(addLicense(xPackInfo.get('license')));
      dispatch(uploadLicenseStatus({}));
      kbnUrl.change(BASE_PATH);
      // reload necessary to get left nav to refresh with proper links
      window.location.reload();
    }
  } else {
    // first message relates to command line interface, so remove it
    const messages = Object.values(acknowledge).slice(1);
    // messages can be in nested arrays
    const first = `Some functionality will be lost if you replace your 
        ${currentLicenseType.toUpperCase()} license with a
        ${newLicenseType.toUpperCase()} license.  Review the list of features below.`;
    dispatch(uploadLicenseStatus({ acknowledge: true, messages: [ first, ...messages] }));
  }

};

export const uploadLicense = (licenseString, currentLicenseType, acknowledge) => async (dispatch, getState, services) => {
  dispatch(uploadLicenseStatus({ applying: true }));
  let newLicenseType = null;
  try {
    ({ type: newLicenseType } = JSON.parse(licenseString).license);
  } catch (err) {
    dispatch(uploadLicenseStatus({}));
    return dispatch(addUploadErrorMessage(`${genericUploadError} Check your license file.`));
  }
  try {
    const response = await putLicense(licenseString, acknowledge);
    await dispatchFromResponse(response, dispatch, currentLicenseType, newLicenseType, services);
  } catch (err) {
    const message = (err.responseJSON && err.responseJSON.error.reason) ? err.responseJSON.error.reason : 'Unknown error.';
    dispatch(uploadLicenseStatus({}));
    dispatch(addUploadErrorMessage(`${genericUploadError} ${message}`));
  }
};

