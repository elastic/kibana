/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClusterSettingsStep } from './get_cluster_settings_step';
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { getComponentTemplatesStep } from './get_component_templates_step';
import { getIlmStep } from './get_ilm_step';
import { getIndexTemplatesStep } from './get_index_templates_step';
import { getFleetPolicyStep } from './get_fleet_policy_step';
import { getSecurityStep } from './get_security_step';
import { getApmPackageStep } from './get_apm_package_step';
import { getCreateEventsDataStreamsStep } from './get_create_events_data_streams';
import { getCreateIndicesStep } from './get_create_indices_step';

export function getProfilingSetupSteps(
  options: ProfilingSetupStepFactoryOptions
): ProfilingSetupStep[] {
  return [
    getApmPackageStep(options),
    getClusterSettingsStep(options),
    getIlmStep(options),
    getComponentTemplatesStep(options),
    getIndexTemplatesStep(options),
    getCreateEventsDataStreamsStep(options),
    getCreateIndicesStep(options),
    getSecurityStep(options),
    getFleetPolicyStep(options),
  ];
}
