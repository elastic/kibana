/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullAgentPolicy } from './agent_policy';

export interface FullAgentConfigMap {
  apiVersion: string;
  kind: string;
  metadata: Metadata;
  data: AgentYML;
}

interface Metadata {
  name: string;
  namespace: string;
  labels: Labels;
}

interface Labels {
  'k8s-app': string;
}

interface AgentYML {
  'agent.yml': FullAgentPolicy;
}
