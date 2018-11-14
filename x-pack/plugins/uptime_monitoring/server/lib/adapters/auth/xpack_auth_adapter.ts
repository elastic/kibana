/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PLUGIN } from '../../../../common/constants';
import { UMAuthAdapter, UMAuthContainer, UMXPackLicenseInfo } from './adapter_types';

// look at index-management for guidance, subscribe to licensecheckerresultsgenerator
// then check the license status
export class UMXPackAuthAdapter implements UMAuthAdapter {
  private xpackLicenseInfo: {
    isActive: boolean | undefined | null;
    licenseType: string | undefined | null;
  };
  constructor(private readonly xpack: UMAuthContainer) {
    this.xpack = xpack;
    this.xpackLicenseInfo = {
      isActive: null,
      licenseType: null,
    };
    this.registerLicenseCheck = this.registerLicenseCheck.bind(this);
    this.xpack.status.once('green', this.registerLicenseCheck);
  }
  public getLicenseType(): string | null {
    return this.xpackLicenseInfo.licenseType || null;
  }
  public licenseIsActive(): boolean {
    return this.xpackLicenseInfo.isActive || false;
  }

  private registerLicenseCheck(): void {
    this.xpack.info.feature(PLUGIN.ID).registerLicenseCheckResultsGenerator(this.updateLicenseInfo);
  }

  private updateLicenseInfo = (xpackLicenseInfo: UMXPackLicenseInfo) => {
    this.xpackLicenseInfo = {
      isActive: xpackLicenseInfo.license.isActive(),
      licenseType: xpackLicenseInfo.license.getType(),
    };
  };
}
