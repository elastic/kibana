/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EndpointMetricsPolicyResponse {
  endpoint: EndpointPolicyResponse;
  agent: EndpointPolicyAgent;
  host: EndpointPolicyHost;
  event: EndpointPolicyEvent;
}

interface EndpointPolicyResponse {
  policy: {
    applied: {
      response: EndpointPolicyResponseDetail;
      artifacts: EndpointPolicyResponseArtifacts;
      name: string;
      id: string;
      endpoint_policy_version: string;
      version: string;
      status: string;
    };
  };
}

interface EndpointPolicyResponseDetail {
  configurations: {};
  diagnostic: {};
}

interface EndpointPolicyResponseArtifacts {
  global: {
    version: string;
  };
  user: {
    vesrion: string;
  };
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
