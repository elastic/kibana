/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicensingServiceSetup } from './licensing_service_setup';
import { LicenseFeatureSerializer } from './types';

export class LicenseFeature {
  private serializable: LicenseFeatureSerializer = service => ({
    name: this.name,
    isAvailable: this.isAvailable,
    isEnabled: this.isEnabled,
  });

  constructor(
    public name: string,
    private feature: any = {},
    private service: LicensingServiceSetup
  ) {}

  public get isAvailable() {
    return !!this.feature.available;
  }

  public get isEnabled() {
    return !!this.feature.enabled;
  }

  public onObject(serializable: LicenseFeatureSerializer) {
    this.serializable = serializable;
  }

  public toObject() {
    return this.serializable(this.service);
  }
}
