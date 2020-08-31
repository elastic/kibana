/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LicenseType } from '../../../licensing/server';

export interface FeaturesAvailability {
  isAvailable: () => boolean;
  license: {
    getType: () => LicenseType | undefined;
  };
}
export type GetLicense = () => Promise<FeaturesAvailability>;
export { registerReportingUsageCollector } from './reporting_usage_collector';
