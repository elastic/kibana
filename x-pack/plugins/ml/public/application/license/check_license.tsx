/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicensingPluginSetup } from '../../../../licensing/public';
import { MlLicense } from '../../../common/license';
import { MlClientLicense } from './ml_client_license';

let mlLicense: MlClientLicense | null = null;

/**
 * Create a new mlLicense and cache it for later checks
 *
 * @export
 * @param {LicensingPluginSetup} licensingSetup
 * @returns {MlClientLicense}
 */
export function setLicenseCache(
  licensingSetup: LicensingPluginSetup,
  postInitFunctions?: Array<(lic: MlLicense) => void>
) {
  mlLicense = new MlClientLicense();
  mlLicense.setup(licensingSetup.license$, postInitFunctions);
  return mlLicense;
}

/**
 * Used as routing resolver to stop the loading of a page if the current license
 * is a trial, platinum or enterprise.
 *
 * @export
 * @returns {Promise<void>} Promise which resolves if the license is trial, platinum or enterprise and rejects if it isn't.
 */
export async function checkFullLicense() {
  if (mlLicense === null) {
    // this should never happen
    console.error('ML Licensing not initialized'); // eslint-disable-line
    return Promise.reject();
  }

  return mlLicense.fullLicenseResolver();
}

/**
 * Used as routing resolver to stop the loading of a page if the current license
 * is at least basic.
 *
 * @export
 * @returns {Promise<void>} Promise resolves if the license is at least basic and rejects if it isn't.
 */
export async function checkBasicLicense() {
  if (mlLicense === null) {
    // this should never happen
    console.error('ML Licensing not initialized'); // eslint-disable-line
    return Promise.reject();
  }

  return mlLicense.basicLicenseResolver();
}

/**
 * Check to see if the current license has expired
 *
 * @export
 * @returns {boolean}
 */
export function hasLicenseExpired() {
  return mlLicense !== null && mlLicense.hasLicenseExpired();
}

/**
 * Check to see if the current license is trial, platinum or enterprise.
 *
 * @export
 * @returns {boolean}
 */
export function isFullLicense() {
  return mlLicense !== null && mlLicense.isFullLicense();
}
