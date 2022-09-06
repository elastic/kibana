/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetAgentPoliciesResponseItem } from '@kbn/fleet-plugin/common';
import { agentPolicyStatuses } from '@kbn/fleet-plugin/common';
import { BaseDataGenerator } from './base_data_generator';

export class FleetAgentPolicyGenerator extends BaseDataGenerator<GetAgentPoliciesResponseItem> {
  generate(overrides: Partial<GetAgentPoliciesResponseItem> = {}): GetAgentPoliciesResponseItem {
    return {
      id: this.seededUUIDv4(),
      name: `Agent Policy ${this.randomString(4)}`,
      status: agentPolicyStatuses.Active,
      description: 'Created by FleetAgentPolicyGenerator',
      namespace: 'default',
      is_managed: false,
      monitoring_enabled: ['logs', 'metrics'],
      revision: 2,
      updated_at: '2020-07-22T16:36:49.196Z',
      updated_by: this.randomUser(),
      agents: 0,
      ...overrides,
    };
  }
}
