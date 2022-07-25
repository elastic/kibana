/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LicenseType } from '@kbn/licensing-plugin/server';

export interface FeaturesAvailability {
  isAvailable: () => boolean;
  license: {
    getType: () => LicenseType | undefined;
  };
}
export type GetLicense = () => Promise<FeaturesAvailability>;
export { registerReportingUsageCollector } from './reporting_usage_collector';
