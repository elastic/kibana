/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MlLicense } from '../../../common/license';
import { showExpiredLicenseWarning } from './expired_warning';

export class MlClientLicense extends MlLicense {
  fullLicenseResolver() {
    if (this.isMlEnabled() === false || this.isMinimumLicense() === false) {
      // ML is not enabled or the license isn't at least basic
      return redirectToKibana();
    }

    if (this.isFullLicense() === false) {
      // ML is enabled, but only with a basic or gold license
      return redirectToBasic();
    }

    // ML is enabled
    if (this.hasLicenseExpired()) {
      showExpiredLicenseWarning();
    }
    return Promise.resolve();
  }

  basicLicenseResolver() {
    if (this.isMlEnabled() === false || this.isMinimumLicense() === false) {
      // ML is not enabled or the license isn't at least basic
      return redirectToKibana();
    }

    // ML is enabled
    if (this.hasLicenseExpired()) {
      showExpiredLicenseWarning();
    }
    return Promise.resolve();
  }
}

function redirectToKibana() {
  window.location.href = '/';
  return Promise.reject();
}

function redirectToBasic() {
  window.location.href = '#/datavisualizer';
  return Promise.reject();
}
