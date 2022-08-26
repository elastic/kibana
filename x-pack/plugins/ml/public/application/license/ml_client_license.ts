/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { ML_PAGES } from '../../../common/constants/locator';
import { MlLicense } from '../../../common/license';
import { showExpiredLicenseWarning } from './expired_warning';
import { PLUGIN_ID } from '../../../common/constants/app';

export class MlClientLicense extends MlLicense {
  constructor(private application: CoreStart['application']) {
    super();
  }

  private redirectToKibana() {
    this.application.navigateToApp('home');
    return Promise.reject();
  }

  private redirectToBasic() {
    this.application.navigateToApp(PLUGIN_ID, { path: ML_PAGES.DATA_VISUALIZER });
    return Promise.reject();
  }

  fullLicenseResolver(): Promise<void> {
    if (this.isMlEnabled() === false || this.isMinimumLicense() === false) {
      // ML is not enabled or the license isn't at least basic
      return this.redirectToKibana();
    }

    if (this.isFullLicense() === false) {
      // ML is enabled, but only with a basic or gold license
      return this.redirectToBasic();
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
      return this.redirectToKibana();
    }

    // ML is enabled
    if (this.hasLicenseExpired()) {
      showExpiredLicenseWarning();
    }
    return Promise.resolve();
  }
}
