/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export class LicenseFeature {
  constructor(public name: string, private feature: any = {}) {}

  public get isAvailable() {
    return !!this.feature.available;
  }

  public get isEnabled() {
    return !!this.feature.enabled;
  }

  public toObject() {
    return {
      name: this.name,
      isAvailable: this.isAvailable,
      isEnabled: this.isEnabled,
    };
  }
}
