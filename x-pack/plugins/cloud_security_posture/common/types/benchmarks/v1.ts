/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { AgentPolicyStatus } from '../../types_old';

export interface Benchmark {
  package_policy: PackagePolicy;
  agent_policy: AgentPolicyStatus;
  rules_count: number;
}
