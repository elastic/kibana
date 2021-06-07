/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../../../types';

export interface BaseProps {
  /**
   * The user has already selected a policy they would like to use
   */
  agentPolicy?: AgentPolicy;

  /**
   * The user should have the option select from multiple policies
   */
  agentPolicies?: AgentPolicy[];
}
