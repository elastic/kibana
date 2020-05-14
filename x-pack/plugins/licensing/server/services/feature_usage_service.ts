/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isDate } from 'lodash';

/** @public */
export interface FeatureUsageServiceSetup {
  /**
   * Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.
   */
  register(featureName: string): void;
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
  getLastUsages(): ReadonlyMap<string, number>;
}

export class FeatureUsageService {
  private readonly features: string[] = [];
  private readonly lastUsages = new Map<string, number>();

  public setup(): FeatureUsageServiceSetup {
    return {
      register: featureName => {
        if (this.features.includes(featureName)) {
          throw new Error(`Feature '${featureName}' has already been registered.`);
        }
        this.features.push(featureName);
      },
    };
  }

  public start(): FeatureUsageServiceStart {
    return {
      notifyUsage: (featureName, usedAt = Date.now()) => {
        if (!this.features.includes(featureName)) {
          throw new Error(`Feature '${featureName}' is not registered.`);
        }
        if (isDate(usedAt)) {
          usedAt = usedAt.getTime();
        }
        const currentValue = this.lastUsages.get(featureName) ?? 0;
        this.lastUsages.set(featureName, Math.max(usedAt, currentValue));
      },
      getLastUsages: () => new Map(this.lastUsages.entries()),
    };
  }
}
