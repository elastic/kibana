/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { PackagePolicyEditExtensionComponent } from '@kbn/fleet-plugin/public';

export const getLazyApmAgentsTabExtension = () => {
  return lazy<PackagePolicyEditExtensionComponent>(async () => {
    const { ApmAgents } = await import('./apm_agents');
    return { default: ApmAgents };
  });
};
