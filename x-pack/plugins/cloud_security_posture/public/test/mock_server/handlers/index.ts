/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultFleetEpmPackagesCloudSecurityPosture } from './api/fleet_epm_packages_cloud_security_posture';
import { defaultApiLicensingInfo } from './api/licensing_info_handler';
import { defaultBenchmarks } from './internal/cloud_security_posture/benchmark_handlers';

export const defaultHandlers = [
  defaultApiLicensingInfo,
  defaultFleetEpmPackagesCloudSecurityPosture,
  defaultBenchmarks,
];
