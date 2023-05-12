/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import {
  AggregatedTransactionsCounts,
  APMUsage,
  TimeframeMap,
  TimeframeMap1d,
  TimeframeMapAll,
  APMPerService,
} from './types';
import { ElasticAgentName } from '../../../typings/es_schemas/ui/fields/agent';

const long: { type: 'long' } = { type: 'long' };

const keyword: { type: 'keyword' } = { type: 'keyword' };

const aggregatedTransactionCountSchema: MakeSchemaFrom<AggregatedTransactionsCounts> =
  {
    expected_metric_document_count: long,
    transaction_count: long,
  };

const timeframeMap1dSchema: MakeSchemaFrom<TimeframeMap1d> = {
  '1d': long,
};

const timeframeMapAllSchema: MakeSchemaFrom<TimeframeMapAll> = {
  all: long,
};

const timeframeMapSchema: MakeSchemaFrom<TimeframeMap> = {
  ...timeframeMap1dSchema,
  ...timeframeMapAllSchema,
};

const agentSchema: MakeSchemaFrom<APMUsage>['agents'][ElasticAgentName] = {
  agent: {
    version: { type: 'array', items: { type: 'keyword' } },
    activation_method: { type: 'array', items: { type: 'keyword' } },
  },
  service: {
    framework: {
      name: { type: 'array', items: { type: 'keyword' } },
      version: { type: 'array', items: { type: 'keyword' } },
      composite: { type: 'array', items: { type: 'keyword' } },
    },
    language: {
      name: { type: 'array', items: { type: 'keyword' } },
      version: { type: 'array', items: { type: 'keyword' } },
      composite: { type: 'array', items: { type: 'keyword' } },
    },
    runtime: {
      name: { type: 'array', items: { type: 'keyword' } },
      version: { type: 'array', items: { type: 'keyword' } },
      composite: { type: 'array', items: { type: 'keyword' } },
    },
  },
};

const apmPerAgentSchema: Pick<
  MakeSchemaFrom<APMUsage>,
  'services_per_agent' | 'agents'
> = {
  // services_per_agent: AGENT_NAMES.reduce(
  //   (acc, name) => ({ ...acc, [name]: long }),
  //   {} as Record<AgentName, typeof long>
  // ),
  // agents: AGENT_NAMES.reduce(
  //   (acc, name) => ({ ...acc, [name]: agentSchema }),
  //   {} as Record<AgentName, typeof agentSchema>
  // ),
  // TODO: Find a way for `@kbn/telemetry-tools` to understand and evaluate expressions.
  //  In the meanwhile, we'll have to maintain these lists up to date (TS will remind us to update)
  services_per_agent: {
    'android/java': long,
    dotnet: long,
    'iOS/swift': long,
    go: long,
    java: long,
    'js-base': long,
    nodejs: long,
    php: long,
    python: long,
    ruby: long,
    'rum-js': long,
    otlp: long,
    'opentelemetry/cpp': long,
    'opentelemetry/dotnet': long,
    'opentelemetry/erlang': long,
    'opentelemetry/go': long,
    'opentelemetry/java': long,
    'opentelemetry/nodejs': long,
    'opentelemetry/php': long,
    'opentelemetry/python': long,
    'opentelemetry/ruby': long,
    'opentelemetry/rust': long,
    'opentelemetry/swift': long,
    'opentelemetry/webjs': long,
  },
  agents: {
    'android/java': agentSchema,
    dotnet: agentSchema,
    'iOS/swift': agentSchema,
    go: agentSchema,
    java: agentSchema,
    'js-base': agentSchema,
    nodejs: agentSchema,
    php: agentSchema,
    python: agentSchema,
    ruby: agentSchema,
    'rum-js': agentSchema,
  },
};

export const apmPerServiceSchema: MakeSchemaFrom<APMPerService> = {
  service_id: keyword,
  num_service_nodes: long,
  num_transaction_types: long,
  timed_out: { type: 'boolean' },
  cloud: {
    availability_zones: { type: 'array', items: { type: 'keyword' } },
    regions: { type: 'array', items: { type: 'keyword' } },
    providers: { type: 'array', items: { type: 'keyword' } },
  },
  faas: {
    trigger: {
      type: { type: 'array', items: { type: 'keyword' } },
    },
  },
  agent: {
    name: keyword,
    version: keyword,
    activation_method: keyword,
  },
  service: {
    language: {
      name: keyword,
      version: keyword,
    },
    framework: {
      name: keyword,
      version: keyword,
    },
    runtime: {
      name: keyword,
      version: keyword,
    },
  },
  kubernetes: {
    pod: {
      name: keyword,
    },
  },
  container: {
    id: keyword,
  },
};

export const apmSchema: MakeSchemaFrom<APMUsage> = {
  ...apmPerAgentSchema,
  has_any_services: {
    type: 'boolean',
    _meta: {
      description:
        'Indicates whether any service is being monitored. This is determined by checking all agents.',
    },
  },
  version: {
    apm_server: {
      major: {
        ...long,
        _meta: {
          description: 'The major version of the APM server. Example: 7',
        },
      },
      minor: {
        ...long,
        _meta: {
          description: 'The minor version of the APM server. Example: 17',
        },
      },
      patch: {
        ...long,
        _meta: {
          description: 'The patch version of the APM server. Example 3',
        },
      },
    },
  },
  environments: {
    services_without_environment: {
      ...long,
      _meta: {
        description:
          'Number of services without an assigned environment. This is determined by checking the "service.environment" field and counting instances where it is null',
      },
    },
    services_with_multiple_environments: {
      ...long,
      _meta: {
        description:
          'Number of services with more than one assigned environment',
      },
    },
    top_environments: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 5 environments in terms of document count',
        },
      },
    },
  },
  // #NOTE No task identified for extracting the following information
  aggregated_transactions: {
    current_implementation: aggregatedTransactionCountSchema,
    no_observer_name: aggregatedTransactionCountSchema,
    no_rum: aggregatedTransactionCountSchema,
    no_rum_no_observer_name: aggregatedTransactionCountSchema,
    only_rum: aggregatedTransactionCountSchema,
    only_rum_no_observer_name: aggregatedTransactionCountSchema,
  },
  cloud: {
    availability_zone: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 10 cloud availability zones in terms of document count. Example: [us-east1-c, us-east1-b]',
        },
      },
    },
    provider: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 10 cloud providers in terms of document count. Example: [azure]',
        },
      },
    },
    region: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 10 cloud regions in terms of document count. Example: [us-west1, us-central1]',
        },
      },
    },
  },
  host: {
    os: {
      platform: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'An array of the top 10 operating system platforms in terms of document count. Example: [linux, win32]',
          },
        },
      },
    },
  },
  counts: {
    transaction: timeframeMapSchema,
    span: timeframeMapSchema,
    error: timeframeMapSchema,
    metric: timeframeMapSchema,
    onboarding: timeframeMapSchema,
    agent_configuration: timeframeMapAllSchema,
    max_transaction_groups_per_service: timeframeMapSchema,
    max_error_groups_per_service: timeframeMapSchema,
    traces: timeframeMapSchema,
    services: timeframeMapSchema,
  },
  cardinality: {
    client: { geo: { country_iso_code: { rum: timeframeMap1dSchema } } },
    user_agent: {
      original: {
        all_agents: timeframeMap1dSchema,
        rum: timeframeMap1dSchema,
      },
    },
    transaction: {
      name: {
        all_agents: timeframeMap1dSchema,
        rum: timeframeMap1dSchema,
      },
    },
  },
  retainment: {
    span: { ms: long },
    transaction: { ms: long },
    error: { ms: long },
    metric: { ms: long },
    onboarding: { ms: long },
  },
  integrations: { ml: { all_jobs_count: long } },

  indices: {
    metric: {
      shards: { total: long },
      all: {
        total: {
          docs: { count: long },
          store: { size_in_bytes: long },
        },
      },
    },
    traces: {
      shards: { total: long },
      all: {
        total: {
          docs: { count: long },
          store: { size_in_bytes: long },
        },
      },
    },
    shards: { total: long },
    all: {
      total: {
        docs: { count: long },
        store: { size_in_bytes: long },
      },
    },
  },
  service_groups: {
    kuery_fields: { type: 'array', items: { type: 'keyword' } },
    total: long,
  },
  per_service: { type: 'array', items: { ...apmPerServiceSchema } },
  tasks: {
    aggregated_transactions: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "aggregated_transactions" task',
          },
        },
      },
    },
    cloud: {
      took: {
        ms: {
          ...long,
          _meta: {
            description: 'Execution time in milliseconds for the "cloud" task',
          },
        },
      },
    },
    host: {
      took: {
        ms: {
          ...long,
          _meta: {
            description: 'Execution time in milliseconds for the "host" task',
          },
        },
      },
    },
    processor_events: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "processor_events" task',
          },
        },
      },
    },
    agent_configuration: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "agent_configuration" task',
          },
        },
      },
    },
    services: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "services" task',
          },
        },
      },
    },
    versions: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "versions" task',
          },
        },
      },
    },
    groupings: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "groupings" task',
          },
        },
      },
    },
    integrations: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "integrations" task',
          },
        },
      },
    },
    agents: {
      took: {
        ms: {
          ...long,
          _meta: {
            description: 'Execution time in milliseconds for the "agents" task',
          },
        },
      },
    },
    indices_stats: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "indices_stats" task',
          },
        },
      },
    },
    cardinality: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "cardinality" task',
          },
        },
      },
    },
    environments: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "environments" task',
          },
        },
      },
    },
    service_groups: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "service_groups" task',
          },
        },
      },
    },
    per_service: {
      took: {
        ms: {
          ...long,
          _meta: {
            description:
              'Execution time in milliseconds for the "per_service" task',
          },
        },
      },
    },
  },
};
