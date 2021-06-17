/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../../types';

export interface BaseProps {
  /**
   * The user selected policy to be used. If this value is `undefined` a value must be provided for `agentPolicies`.
   */
  agentPolicy?: AgentPolicy;

  /**
   * A selection of policies for the user to choose from, will be ignored if `agentPolicy` has been provided.
   *
   * If this value is `undefined` a value must be provided for `agentPolicy`.
   */
  agentPolicies?: AgentPolicy[];

  /**
   * There is a step in the agent enrollment process that allows users to see the data from an integration represented in the UI
   * in some way. This is an area for consumers to render a button and text explaining how data can be viewed.
   */
  viewDataStepContent?: JSX.Element;
}
