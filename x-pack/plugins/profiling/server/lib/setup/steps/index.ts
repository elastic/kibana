/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { getClusterSettingsStep } from './get_cluster_settings_step';
import { getFleetPolicyStep } from './get_fleet_policy_step';
import { getSecurityStep } from './get_security_step';
import { getApmPackageStep } from './get_apm_package_step';

export function getProfilingSetupSteps(
  options: ProfilingSetupStepFactoryOptions
): ProfilingSetupStep[] {
  return [
    getApmPackageStep(options),
    getClusterSettingsStep(options),
    getSecurityStep(options),
    getFleetPolicyStep(options),
  ];
}
