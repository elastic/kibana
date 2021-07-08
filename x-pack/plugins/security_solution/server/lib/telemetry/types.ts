/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// EP Policy Response

export interface EndpointPolicyResponseAggregation {
  hits: {
    total: { value: number };
  };
  aggregations: {
    policy_responses: {
      buckets: Array<{
        key: string;
        doc_count: number;
        latest_response: EndpointPolicyResponseHits;
      }>;
    };
  };
}

interface EndpointPolicyResponseHits {
  hits: {
    total: { value: number };
    hits: EndpointPolicyResponseDocument[];
  };
}

export interface EndpointPolicyResponseDocument {
  _source: {
    '@timestamp': string;
    agent: {
      id: string;
    };
    event: {
      agent_id_status: string;
    };
    Endpoint: {
      policy: {
        applied: {
          actions: Array<{
            name: string;
            message: string;
            status: string;
          }>;
          artifacts: {
            global: {
              version: string;
            };
          };
          status: string;
        };
      };
    };
  };
}

// EP Metrics

export interface EndpointMetricsAggregation {
  hits: {
    total: { value: number };
  };
  aggregations: {
    endpoint_agents: {
      buckets: Array<{ key: string; doc_count: number; latest_metrics: EndpointMetricHits }>;
    };
  };
}

interface EndpointMetricHits {
  hits: {
    total: { value: number };
    hits: EndpointMetricDocument[];
  };
}

interface EndpointMetricDocument {
  _source: {
    '@timestamp': string;
    agent: {
      id: string;
      version: string;
    };
    Endpoint: {
      metrics: EndpointMetrics;
    };
    elastic: {
      agent: {
        id: string;
      };
    };
    host: {
      os: EndpointMetricOS;
    };
    event: {
      agent_id_status: string;
    };
  };
}

export interface EndpointMetrics {
  memory: {
    endpoint: {
      private: {
        mean: number;
        latest: number;
      };
    };
  };
  cpu: {
    endpoint: {
      histogram: {
        counts: number[];
        values: number[];
      };
      mean: number;
      latest: number;
    };
  };
  uptime: {
    endpoint: number;
    system: number;
  };
}

interface EndpointMetricOS {
  Ext: {
    variant: string;
  };
  kernel: string;
  name: string;
  family: string;
  version: string;
  platform: string;
  full: string;
}
