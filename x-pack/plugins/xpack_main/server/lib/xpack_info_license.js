/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

/**
 * "View" for XPack Info license information.
 */
export class XPackInfoLicense {
  /**
   * Function that retrieves license information from the XPack info object.
   * @type {Function}
   * @private
   */
  _getRawLicense = null;

  constructor(getRawLicense) {
    this._getRawLicense = getRawLicense;
  }

  /**
   * Returns unique identifier of the license.
   * @returns {string|undefined}
   */
  getUid() {
    return get(this._getRawLicense(), 'uid');
  }

  /**
   * Indicates whether license is still active.
   * @returns {boolean}
   */
  isActive() {
    return get(this._getRawLicense(), 'status') === 'active';
  }

  /**
   * Returns license expiration date in ms.
   * @returns {number|undefined}
   */
  getExpiryDateInMillis() {
    return get(this._getRawLicense(), 'expiry_date_in_millis');
  }

  /**
   * Checks if the license is represented in a specified license list.
   * @param candidateLicenses List of the licenses to check against.
   * @returns {boolean}
   */
  isOneOf(candidateLicenses) {
    if (!Array.isArray(candidateLicenses)) {
      candidateLicenses = [candidateLicenses];
    }

    return candidateLicenses.includes(get(this._getRawLicense(), 'mode'));
  }

  /**
   * Returns type of the license (basic, gold etc.).
   * @returns {string|undefined}
   */
  getType() {
    return get(this._getRawLicense(), 'type');
  }
}
