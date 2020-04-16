/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface FeatureUsageServiceSetup {
  register(featureName: string): void;
}
export interface FeatureUsageServiceStart {
  notifyUsage(featureName: string, usedAt?: number): void;
  getLastUsages(): ReadonlyMap<string, number>;
  clear(): void;
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
        const currentValue = this.lastUsages.get(featureName) ?? 0;
        this.lastUsages.set(featureName, Math.max(usedAt, currentValue));
      },
      getLastUsages: () => new Map(this.lastUsages.entries()),
      clear: () => {
        this.lastUsages.clear();
      },
    };
  }
}
