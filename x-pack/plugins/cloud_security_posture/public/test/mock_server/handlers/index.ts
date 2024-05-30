/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultFleetEpmPackagesCloudSecurityPosture } from './api/fleet_epm_packages_cloud_security_posture';
import { defaultApiLicensingInfo } from './api/licensing_info_handler';
import { defaultBenchmarks } from './internal/cloud_security_posture/benchmark_handlers';

/**
 * Default handlers for the mock server, these are the handlers that are always enabled
 * when the mock server is started, but can be overridden by specific tests when needed.
 * Recommended to use these handlers for common endpoints.
 */
export const defaultHandlers = [
  defaultApiLicensingInfo,
  defaultFleetEpmPackagesCloudSecurityPosture,
  defaultBenchmarks,
];
