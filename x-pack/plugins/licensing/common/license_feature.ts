/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRawFeature } from './types';

const empty = { available: false, enabled: false };

/**
 * @public
 */
export class LicenseFeature {
  constructor(public name: string, private feature: IRawFeature = empty) {}

  /**
   * Determine if the feature is available.
   */
  public get isAvailable() {
    return this.feature.available;
  }

  /**
   * Determine if the feature is enabled.
   */
  public get isEnabled() {
    return this.feature.enabled;
  }

  /**
   * Create an object suitable for feature serialization.
   */
  public toObject() {
    return {
      name: this.name,
      isAvailable: this.isAvailable,
      isEnabled: this.isEnabled,
    };
  }
}
