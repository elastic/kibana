/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isDate } from 'lodash';
import { LicenseType } from '../../common/types';

/** @public */
export interface FeatureUsageServiceSetup {
  /**
   * Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.
   */
  register(featureName: string, licenseType: LicenseType): void;
}

export interface LastFeatureUsage {
  name: string;
  lastUsed: Date | null;
  licenseType: LicenseType;
}

/** @public */
export interface FeatureUsageServiceStart {
  /**
   * Notify of a registered feature usage at given time.
   *
   * @param featureName - the name of the feature to notify usage of
   * @param usedAt - Either a `Date` or an unix timestamp with ms. If not specified, it will be set to the current time.
   */
  notifyUsage(featureName: string, usedAt?: Date | number): void;
  /**
   * Return a map containing last usage timestamp for all features.
   * Features that were not used yet do not appear in the map.
   */
  getLastUsages(): LastFeatureUsage[];
}

export class FeatureUsageService {
  private readonly lastUsages = new Map<string, LastFeatureUsage>();

  public setup(): FeatureUsageServiceSetup {
    return {
      register: (featureName, licenseType) => {
        if (this.lastUsages.has(featureName)) {
          throw new Error(`Feature '${featureName}' has already been registered.`);
        }
        this.lastUsages.set(featureName, {
          name: featureName,
          lastUsed: null,
          licenseType,
        });
      },
    };
  }

  public start(): FeatureUsageServiceStart {
    return {
      notifyUsage: (featureName, usedAt = Date.now()) => {
        const usage = this.lastUsages.get(featureName);
        if (!usage) {
          throw new Error(`Feature '${featureName}' is not registered.`);
        }

        const lastUsed = isDate(usedAt) ? usedAt : new Date(usedAt);
        if (usage.lastUsed == null || lastUsed > usage.lastUsed) {
          usage.lastUsed = lastUsed;
        }
      },
      getLastUsages: () => Array.from(this.lastUsages.values()),
    };
  }
}
