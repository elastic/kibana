/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isDate from 'lodash/isDate';
import type { HttpSetup, HttpStart } from 'src/core/public';
import { LicenseType } from '../../common/types';

/** @public */
export interface FeatureUsageServiceSetup {
  /**
   * Register a feature to be able to notify of it's usages using the {@link FeatureUsageServiceStart | service start contract}.
   */
  register(featureName: string, licenseType: LicenseType): Promise<void>;
}

/** @public */
export interface FeatureUsageServiceStart {
  /**
   * Notify of a registered feature usage at given time.
   *
   * @param featureName - the name of the feature to notify usage of
   * @param usedAt - Either a `Date` or an unix timestamp with ms. If not specified, it will be set to the current time.
   */
  notifyUsage(featureName: string, usedAt?: Date | number): Promise<void>;
}

interface SetupDeps {
  http: HttpSetup;
}

interface StartDeps {
  http: HttpStart;
}

/**
 * @internal
 */
export class FeatureUsageService {
  public setup({ http }: SetupDeps): FeatureUsageServiceSetup {
    return {
      register: async (featureName, licenseType) => {
        await http.post('/internal/licensing/feature_usage/register', {
          body: JSON.stringify({
            featureName,
            licenseType,
          }),
        });
      },
    };
  }

  public start({ http }: StartDeps): FeatureUsageServiceStart {
    return {
      notifyUsage: async (featureName, usedAt = Date.now()) => {
        const lastUsed = isDate(usedAt) ? usedAt.getTime() : usedAt;
        await http.post('/internal/licensing/feature_usage/notify', {
          body: JSON.stringify({
            featureName,
            lastUsed,
          }),
        });
      },
    };
  }
}
