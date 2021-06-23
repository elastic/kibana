/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Sec Sol Kbn telemetry instrumentation specific

export interface FleetAgentCacheItem {
  policy_id: string | undefined;
  policy_version: string | undefined;
}

// EP Policy Response

export interface EndpointMetricsPolicyResponse {
  agent: EndpointAgent; // endpoint agent
  elastic: EndpointPolicyAgent; // fleet agent
  Endpoint: EndpointPolicyResponse;
  event: EndpointPolicyEvent;
  host: EndpointPolicyHost;
}

interface EndpointAgent {
  id: string;
}

interface EndpointPolicyResponse {
  policy: {
    applied: {
      artifacts: EndpointPolicyResponseArtifacts;
      actions: EndpointPolicyResponseAction[];
      name: string;
      id: string;
      endpoint_policy_version: string;
      version: string;
      status: string;
    };
  };
}

interface EndpointPolicyResponseArtifacts {
  global: {
    version: string;
  };
  user: {
    vesrion: string;
  };
}

interface EndpointPolicyResponseAction {
  name: string;
  message: string;
  status: string;
}

interface EndpointPolicyAgent {
  agent: {
    id: string;
  };
}

interface EndpointPolicyHost {
  hostname: string;
  os: {
    kernel: string;
    family: string;
    version: string;
    architecture: string;
  };
}

interface EndpointPolicyEvent {
  agent_id_status: string;
  created: string;
  action: string;
}

// EP Metrics

export interface EndpointMetrics {
  endpoint_id: string;
  fleet_agent_id: string;
  os_name: string;
  os_platform: string;
  os_version: string;
  uptime_endpoint: string;
  uptime_system: string;
  memory: EndpointMetricMemory;
  cpu: EndpointMetricCPU;
}

interface EndpointMetricMemory {
  mean: string;
  latest: string;
}

interface EndpointMetricCPU {
  mean: string;
  histogram: Array<{ key: string; value: number }>;
}
