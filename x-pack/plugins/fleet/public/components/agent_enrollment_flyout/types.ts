/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../types';

export interface BaseProps {
  /**
   * The user selected policy to be used
   */
  agentPolicy?: AgentPolicy;

  /**
   * A selection of policies for the user to choose from, will be ignored if `agentPolicy` has been provided
   */
  agentPolicies?: AgentPolicy[];
}
