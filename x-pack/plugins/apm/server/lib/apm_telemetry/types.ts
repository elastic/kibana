/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DeepPartial } from 'utility-types';
import { AgentName } from '../../../typings/es_schemas/ui/fields/agent';

export interface TimeframeMap {
  '1d': number;
  all: number;
}

export type TimeframeMap1d = Pick<TimeframeMap, '1d'>;
export type TimeframeMapAll = Pick<TimeframeMap, 'all'>;

export type APMDataTelemetry = DeepPartial<{
  has_any_services: boolean;
  services_per_agent: Record<AgentName, number>;
  version: {
    apm_server: {
      minor: number;
      major: number;
      patch: number;
    };
  };
  cloud: {
    availability_zone: string[];
    provider: string[];
    region: string[];
  };
  counts: {
    transaction: TimeframeMap;
    span: TimeframeMap;
    error: TimeframeMap;
    metric: TimeframeMap;
    sourcemap: TimeframeMap;
    onboarding: TimeframeMap;
    agent_configuration: TimeframeMapAll;
    max_transaction_groups_per_service: TimeframeMap;
    max_error_groups_per_service: TimeframeMap;
    traces: TimeframeMap;
    services: TimeframeMap;
  };
  cardinality: {
    user_agent: {
      original: {
        all_agents: TimeframeMap1d;
        rum: TimeframeMap1d;
      };
    };
    transaction: {
      name: {
        all_agents: TimeframeMap1d;
        rum: TimeframeMap1d;
      };
    };
  };
  retainment: Record<
    'span' | 'transaction' | 'error' | 'metric' | 'sourcemap' | 'onboarding',
    { ms: number }
  >;
  integrations: {
    ml: {
      all_jobs_count: number;
    };
  };
  agents: Record<
    AgentName,
    {
      agent: {
        version: string[];
      };
      service: {
        framework: {
          name: string[];
          version: string[];
          composite: string[];
        };
        language: {
          name: string[];
          version: string[];
          composite: string[];
        };
        runtime: {
          name: string[];
          version: string[];
          composite: string[];
        };
      };
    }
  >;
  indices: {
    shards: {
      total: number;
    };
    all: {
      total: {
        docs: {
          count: number;
        };
        store: {
          size_in_bytes: number;
        };
      };
    };
  };
  tasks: Record<
    | 'cloud'
    | 'processor_events'
    | 'agent_configuration'
    | 'services'
    | 'versions'
    | 'groupings'
    | 'integrations'
    | 'agents'
    | 'indices_stats'
    | 'cardinality',
    { took: { ms: number } }
  >;
}>;

export type APMTelemetry = APMDataTelemetry;
