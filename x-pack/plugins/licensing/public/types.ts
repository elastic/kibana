/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';

import { ILicense } from '../common/types';
import { FeatureUsageServiceSetup, FeatureUsageServiceStart } from './services';

/** @public */
export interface LicensingPluginSetup {
  /**
   * Steam of licensing information {@link ILicense}.
   * @deprecated in favour of the counterpart provided from start contract
   */
  license$: Observable<ILicense>;
  /**
   * Triggers licensing information re-fetch.
   * @deprecated in favour of the counterpart provided from start contract
   */
  refresh(): Promise<ILicense>;
  /**
   * APIs to register licensed feature usage.
   */
  featureUsage: FeatureUsageServiceSetup;
}

/** @public */
export interface LicensingPluginStart {
  /**
   * Steam of licensing information {@link ILicense}.
   */
  license$: Observable<ILicense>;
  /**
   * Triggers licensing information re-fetch.
   */
  refresh(): Promise<ILicense>;
  /**
   * APIs to manage licensed feature usage.
   */
  featureUsage: FeatureUsageServiceStart;
}
