/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { defaultStatusInstalled } from './status_handlers';
import { defaultBenchmarks } from './benchmark_handlers';
import { defaultRulesGetStates } from './rules_handlers';
import { defaultApiLicensingInfo } from './api/licensing_handler';
import { defaultDataViewFindHandler } from './data_views/find';
import { defaultEpmPackagesCloudSecurityPosture } from './api/fleet/epm_packages_cloud_security_posture_handler';

export const defaultHandlers = [
  defaultStatusInstalled,
  defaultBenchmarks,
  defaultRulesGetStates,
  defaultApiLicensingInfo,
  defaultDataViewFindHandler,
  defaultEpmPackagesCloudSecurityPosture,
];
