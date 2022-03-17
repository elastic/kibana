/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Values } from '@kbn/utility-types';
import { LicensingPluginSetup, LicensingPluginStart } from '../../../../../licensing/server';

const FEATURES = {
  HOST_ISOLATION: 'Host isolation',
  HOST_ISOLATION_EXCEPTION: 'Host isolation exception',
  HOST_ISOLATION_EXCEPTION_BY_POLICY: 'Host isolation exception by policy',
  TRUSTED_APP_BY_POLICY: 'Trusted app by policy',
  EVENT_FILTERS_BY_POLICY: 'Event filters by policy',
  RANSOMWARE_PROTECTION: 'Ransomeware protection',
  MEMORY_THREAT_PROTECTION: 'Memory threat protection',
  BEHAVIOR_PROTECTION: 'Behavior protection',
} as const;

export type FeatureKeys = keyof typeof FEATURES;

export class FeatureUsageService {
  private licensingPluginStart: LicensingPluginStart | undefined;

  private get notify(): (featureName: Values<typeof FEATURES>) => void {
    return this.licensingPluginStart?.featureUsage.notifyUsage || function () {};
  }

  public setup(licensingPluginSetup: LicensingPluginSetup): void {
    Object.values(FEATURES).map((featureValue) =>
      licensingPluginSetup.featureUsage.register(featureValue, 'platinum')
    );
  }

  public start(licensingPluginStart: LicensingPluginStart): void {
    this.licensingPluginStart = licensingPluginStart;
  }

  public notifyUsage(featureKey: FeatureKeys): void {
    this.notify(FEATURES[featureKey]);
  }
}
