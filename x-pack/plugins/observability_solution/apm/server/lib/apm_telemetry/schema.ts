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
  APMPerService,
  DataStreamCombined,
} from './types';
import { ElasticAgentName } from '../../../typings/es_schemas/ui/fields/agent';

const aggregatedTransactionCountSchema: MakeSchemaFrom<
  AggregatedTransactionsCounts,
  true
> = {
  expected_metric_document_count: {
    type: 'long',
    _meta: {
      description: '',
    },
  },
  transaction_count: {
    type: 'long',
    _meta: {
      description: '',
    },
  },
};

const dataStreamCombinedSchema: MakeSchemaFrom<DataStreamCombined, true> = {
  all: {
    total: {
      shards: {
        type: 'long',
        _meta: {
          description:
            'Total number of shards for the given metricset per rollup interval.',
        },
      },
      docs: {
        count: {
          type: 'long',
          _meta: {
            description:
              'Total number of metric documents in the primary shard for the given metricset per rollup interval',
          },
        },
      },
      store: {
        size_in_bytes: {
          type: 'long',
          _meta: {
            description:
              'Size of the metric index in the primary shard for the given metricset per rollup interval',
          },
        },
      },
    },
  },
  '1d': {
    doc_count: {
      type: 'long',
      _meta: {
        description:
          'Document count for the last day for a given metricset and rollup interval',
      },
    },
  },
};

const agentSchema: MakeSchemaFrom<APMUsage, true>['agents'][ElasticAgentName] =
  {
    agent: {
      version: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'An array of the top 3 agent versions within the last day',
          },
        },
      },
      activation_method: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'An array of the top 3 agent activation methods within the last day',
          },
        },
      },
    },
    service: {
      framework: {
        name: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'An array of the top 3 service framework name  within the last day',
            },
          },
        },
        version: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'An array of the top 3 service framework version within the last day',
            },
          },
        },
        composite: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'Composite field containing service framework and version sorted by doc count',
            },
          },
        },
      },
      language: {
        name: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'An array of the top 3 service language name within the last day',
            },
          },
        },
        version: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'An array of the top 3 service language version within the last day',
            },
          },
        },
        composite: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'Composite field containing service language name and version sorted by doc count.',
            },
          },
        },
      },
      runtime: {
        name: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'An array of the top 3 service runtime name within the last day',
            },
          },
        },
        version: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'An array of the top 3 service runtime version within the last day',
            },
          },
        },
        composite: {
          type: 'array',
          items: {
            type: 'keyword',
            _meta: {
              description:
                'Composite field containing service runtime name and version sorted by doc count.',
            },
          },
        },
      },
    },
  };

const apmPerAgentSchema: Pick<
  MakeSchemaFrom<APMUsage, true>,
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
    'android/java': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the android/java agent within the last day',
      },
    },
    dotnet: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the dotnet (.Net) agent within the last day',
      },
    },
    'iOS/swift': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the iOS/swift agent within the last day',
      },
    },
    go: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the go agent within the last day',
      },
    },
    java: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the Java agent within the last day',
      },
    },
    'js-base': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the js-base agent within the last day',
      },
    },
    nodejs: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the nodeJS agent within the last day',
      },
    },
    php: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the PHH agent within the last day',
      },
    },
    python: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the Python agent within the last day',
      },
    },
    ruby: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the Ruby agent within the last day',
      },
    },
    'rum-js': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the rum-js agent within the last day',
      },
    },
    otlp: {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the otlp agent within the last day',
      },
    },
    'opentelemetry/cpp': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/cpp agent within the last day',
      },
    },
    'opentelemetry/dotnet': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/dotnet agent within the last day',
      },
    },
    'opentelemetry/erlang': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/erlang agent within the last day',
      },
    },
    'opentelemetry/go': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/go agent within the last day',
      },
    },
    'opentelemetry/java': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/java agent within the last day',
      },
    },
    'opentelemetry/nodejs': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/nodejs agent within the last day',
      },
    },
    'opentelemetry/php': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/php agent within the last day',
      },
    },
    'opentelemetry/python': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/python agent within the last day',
      },
    },
    'opentelemetry/ruby': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/ruby agent within the last day',
      },
    },
    'opentelemetry/rust': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/rust agent within the last day',
      },
    },
    'opentelemetry/swift': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/swift agent within the last day',
      },
    },
    'opentelemetry/android': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/android agent within the last day',
      },
    },
    'opentelemetry/webjs': {
      type: 'long',
      _meta: {
        description:
          'Total number of services utilizing the opentelemetry/webjs agent within the last day',
      },
    },
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

export const apmPerServiceSchema: MakeSchemaFrom<APMPerService, true> = {
  service_id: {
    type: 'keyword',
    _meta: {
      description:
        'Unique identifier that combines the SHA256 hashed representation of the service name and environment',
    },
  },
  num_service_nodes: {
    type: 'long',
    _meta: {
      description:
        'Total number of the unique service instances that served the transaction within an hour',
    },
  },
  num_transaction_types: {
    type: 'long',
    _meta: {
      description:
        'Total number of the unique transaction types within an hour',
    },
  },
  timed_out: {
    type: 'boolean',
    _meta: {
      description: 'Indicates whether the request timed out before completion',
    },
  },
  cloud: {
    availability_zones: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 5 cloud availability zones within an hour. Example [ca-central-1a, ca-central-1b]',
        },
      },
    },
    regions: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 5 cloud regions within an hour. Example [ca-central-1]',
        },
      },
    },
    providers: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 3 cloud provider within an hour. Example [aws]',
        },
      },
    },
  },
  faas: {
    trigger: {
      type: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: {
            description:
              'An array of the top 5 faas trigger types within an hour. Example [http, timer, pubsub]',
          },
        },
      },
    },
  },
  agent: {
    name: {
      type: 'keyword',
      _meta: {
        description:
          'The top value of agent name for the service from transaction documents within an hour. Sorted by _score',
      },
    },
    version: {
      type: 'keyword',
      _meta: {
        description:
          'The top value of agent version for the service from transaction documents within an hour. Sorted by _score',
      },
    },
    activation_method: {
      type: 'keyword',
      _meta: {
        description:
          'The top value of agent activation method for the service from transaction documents within an hour. Sorted by _score',
      },
    },
  },
  service: {
    language: {
      name: {
        type: 'keyword',
        _meta: {
          description:
            'The top value of language name for the service from transaction documents within an hour. Sorted by _score',
        },
      },
      version: {
        type: 'keyword',
        _meta: {
          description:
            'The top value of language version for the service from transaction documents within an hour. Sorted by _score',
        },
      },
    },
    framework: {
      name: {
        type: 'keyword',
        _meta: {
          description:
            'The top value of service framework name from transaction documents within an hour. Sorted by _score. Example AWS Lambda',
        },
      },
      version: {
        type: 'keyword',
        _meta: {
          description:
            'The top value of service framework version from transaction documents within an hour. Sorted by _score',
        },
      },
    },
    runtime: {
      name: {
        type: 'keyword',
        _meta: {
          description:
            'The top value of service runtime name from transaction documents within an hour. Sorted by _score',
        },
      },
      version: {
        type: 'keyword',
        _meta: {
          description:
            'The top value of service runtime version version from transaction documents within an hour. Sorted by _score',
        },
      },
    },
  },
  // No data found
  kubernetes: {
    pod: {
      name: {
        type: 'keyword',
        _meta: {
          description: 'Kuberneted pod name ',
        },
      },
    },
  },
  // No data found
  container: {
    id: {
      type: 'keyword',
      _meta: {
        description: 'Container id',
      },
    },
  },
};

export const apmSchema: MakeSchemaFrom<APMUsage, true> = {
  ...apmPerAgentSchema,
  has_any_services_per_official_agent: {
    type: 'boolean',
    _meta: {
      description:
        'Indicates whether any service is being monitored. This is determined by checking all officially supported agents within the last day',
    },
  },
  has_any_services: {
    type: 'boolean',
    _meta: {
      description:
        'Indicates whether any service is being monitored within the last day.',
    },
  },
  version: {
    apm_server: {
      major: {
        type: 'long',
        _meta: {
          description: 'The major version of the APM server. Example: 7',
        },
      },
      minor: {
        type: 'long',
        _meta: {
          description: 'The minor version of the APM server. Example: 17',
        },
      },
      patch: {
        type: 'long',
        _meta: {
          description: 'The patch version of the APM server. Example 3',
        },
      },
    },
  },
  environments: {
    services_without_environment: {
      type: 'long',
      _meta: {
        description:
          'Number of services without an assigned environment within the last day. This is determined by checking the "service.environment" field and counting instances where it is null',
      },
    },
    services_with_multiple_environments: {
      type: 'long',
      _meta: {
        description:
          'Number of services with more than one assigned environment within the last day',
      },
    },
    top_environments: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 5 environments in terms of document count within tha last day',
        },
      },
    },
  },
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
            'An array of the top 10 cloud availability zones in terms of document count overall. Example: [us-east1-c, us-east1-b]',
        },
      },
    },
    provider: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 10 cloud providers in terms of document count overall. Example: [azure]',
        },
      },
    },
    region: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of the top 10 cloud regions in terms of document count overall. Example: [us-west1, us-central1]',
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
              'An array of the top 10 operating system platforms in terms of document count within an hour. Example: [linux, win32]',
          },
        },
      },
    },
  },
  counts: {
    transaction: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of transaction documents within the last day',
        },
      },
      all: {
        type: 'long',
        _meta: {
          description: 'Total number of transaction documents overall',
        },
      },
    },
    span: {
      '1d': {
        type: 'long',
        _meta: {
          description: 'Total number of span documents within the last day',
        },
      },
      all: {
        type: 'long',
        _meta: {
          description: 'Total number of span documents overall',
        },
      },
    },
    error: {
      '1d': {
        type: 'long',
        _meta: {
          description: 'Total number of error documents within the last day',
        },
      },
      all: {
        type: 'long',
        _meta: {
          description: 'Total number of error documents overall',
        },
      },
    },
    metric: {
      '1d': {
        type: 'long',
        _meta: {
          description: 'Total number of metric documents within the last day',
        },
      },
      all: {
        type: 'long',
        _meta: {
          description: 'Total number of metric documents overall',
        },
      },
    },
    onboarding: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of onboarding documents within the last day',
        },
      },
      all: {
        type: 'long',
        _meta: {
          description: 'Total number of onboarding documents overall',
        },
      },
    },
    agent_configuration: {
      all: {
        type: 'long',
        _meta: {
          description:
            'Total number of apm-agent-configuration documents overall',
        },
      },
    },
    global_labels: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of global labels used for creating aggregation keys for internal metrics computed from indices which received data in the last 24 hours',
        },
      },
    },
    max_transaction_groups_per_service: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of distinct transaction groups for the top service for the last 24 hours',
        },
      },
    },
    max_error_groups_per_service: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of distinct error groups for the top service for the last 24 hours',
        },
      },
    },
    traces: {
      '1d': {
        type: 'long',
        _meta: {
          description: 'Total number of trace documents within the last day',
        },
      },
      all: {
        type: 'long',
        _meta: {
          description: 'Total number of trace documents overall',
        },
      },
    },
    services: {
      '1d': {
        type: 'long',
        _meta: {
          description: 'Total number of unique services within the last day',
        },
      },
    },
    environments: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of unique environments within the last day',
        },
      },
    },
    span_destination_service_resource: {
      '1d': {
        type: 'long',
        _meta: {
          description:
            'Total number of unique values of span.destination.service.resource within the last day',
        },
      },
    },
  },
  // FIXME cardinality types seem to be wrong
  cardinality: {
    client: {
      geo: {
        country_iso_code: {
          rum: {
            '1d': {
              type: 'long',
              _meta: {
                description:
                  'Unique country iso code captured for the agents js-base, rum-js and opentelemetry/webjs within the last day',
              },
            },
          },
        },
      },
    },
    user_agent: {
      original: {
        all_agents: {
          '1d': {
            type: 'long',
            _meta: {
              description:
                'Unique user agent for all agents within the last day',
            },
          },
        },
        rum: {
          '1d': {
            type: 'long',
            _meta: {
              description:
                'Unique user agent for rum agent within the last day',
            },
          },
        },
      },
    },
    transaction: {
      name: {
        all_agents: {
          '1d': {
            type: 'long',
            _meta: {
              description:
                'Unique transaction names for all agents within the last day',
            },
          },
        },
        rum: {
          '1d': {
            type: 'long',
            _meta: {
              description:
                'Unique transaction names for rum agent within the last day',
            },
          },
        },
      },
    },
  },
  // Check 1d, and all schema
  retainment: {
    span: {
      ms: {
        type: 'long',
        _meta: {
          description:
            'Represent the time difference in milliseconds between the current date and the date when the span document was recorded',
        },
      },
    },
    transaction: {
      ms: {
        type: 'long',
        _meta: {
          description:
            'Represent the time difference in milliseconds between the current date and the date when the transaction document was recorded',
        },
      },
    },
    error: {
      ms: {
        type: 'long',
        _meta: {
          description:
            'Represent the time difference in milliseconds between the current date and the date when the error document was recorded',
        },
      },
    },
    metric: {
      ms: {
        type: 'long',
        _meta: {
          description:
            'Represent the time difference in milliseconds between the current date and the date when the metric document was recorded',
        },
      },
    },
    onboarding: {
      ms: {
        type: 'long',
        _meta: {
          description:
            'Represent the time difference in milliseconds between the current date and the date when the onboarding document was recorded',
        },
      },
    },
  },
  integrations: {
    ml: {
      all_jobs_count: {
        type: 'long',
        _meta: {
          description:
            'Total number of anomaly detection jobs associated with the jobs apm-*, *-high_mean_response_time',
        },
      },
    },
  },

  indices: {
    metric: {
      shards: {
        total: {
          type: 'long',
          _meta: {
            description: 'Total number of shards for metric indices',
          },
        },
      },
      all: {
        total: {
          docs: {
            count: {
              type: 'long',
              _meta: {
                description: 'Total number of metric documents overall',
              },
            },
          },
          store: {
            size_in_bytes: {
              type: 'long',
              _meta: {
                description:
                  'Size of the metric indicess in byte units overall.',
              },
            },
          },
        },
      },
      metricset: {
        'service_destination-1m': dataStreamCombinedSchema,
        'service_destination-10m': dataStreamCombinedSchema,
        'service_destination-60m': dataStreamCombinedSchema,

        'transaction-1m': dataStreamCombinedSchema,
        'transaction-10m': dataStreamCombinedSchema,
        'transaction-60m': dataStreamCombinedSchema,

        'service_summary-1m': dataStreamCombinedSchema,
        'service_summary-10m': dataStreamCombinedSchema,
        'service_summary-60m': dataStreamCombinedSchema,

        'service_transaction-1m': dataStreamCombinedSchema,
        'service_transaction-10m': dataStreamCombinedSchema,
        'service_transaction-60m': dataStreamCombinedSchema,

        'span_breakdown-1m': dataStreamCombinedSchema,
        'span_breakdown-10m': dataStreamCombinedSchema,
        'span_breakdown-60m': dataStreamCombinedSchema,

        app: dataStreamCombinedSchema,
      },
    },
    traces: {
      shards: {
        total: {
          type: 'long',
          _meta: {
            description:
              'Total number of shards for span and transaction indices',
          },
        },
      },
      all: {
        total: {
          docs: {
            count: {
              type: 'long',
              _meta: {
                description: 'Total number of metric documents overall',
              },
            },
          },
          store: {
            size_in_bytes: {
              type: 'long',
              _meta: {
                description:
                  'Size of the metric indicess in byte units overall.',
              },
            },
          },
        },
      },
    },
    shards: {
      total: {
        type: 'long',
        _meta: {
          description: 'Total number of shards overall',
        },
      },
    },
    all: {
      total: {
        docs: {
          count: {
            type: 'long',
            _meta: {
              description: 'Total number of all documents overall',
            },
          },
        },
        store: {
          size_in_bytes: {
            type: 'long',
            _meta: {
              description: 'Size of the index in byte units overall.',
            },
          },
        },
      },
    },
  },
  service_groups: {
    kuery_fields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of up to 500 unique fields used to create the service groups across all spaces. Example  [service.language.name, service.name] ',
        },
      },
    },
    total: {
      type: 'long',
      _meta: {
        description:
          'Total number of service groups retrived from the saved object across all spaces',
      },
    },
  },
  custom_dashboards: {
    kuery_fields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'An array of up to 500 unique fields used to create the custom dashboards across all spaces. Example  [service.language.name, service.name] ',
        },
      },
    },
    total: {
      type: 'long',
      _meta: {
        description:
          'Total number of custom dashboards retrived from the saved object across all spaces',
      },
    },
  },
  per_service: { type: 'array', items: { ...apmPerServiceSchema } },
  top_traces: {
    max: {
      type: 'long',
      _meta: {
        description:
          'Max number of documents in top 100 traces withing the last day',
      },
    },
    median: {
      type: 'long',
      _meta: {
        description:
          'Median number of documents in top 100 traces within the last day',
      },
    },
  },
  tasks: {
    aggregated_transactions: {
      took: {
        ms: {
          type: 'long',
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
          type: 'long',
          _meta: {
            description: 'Execution time in milliseconds for the "cloud" task',
          },
        },
      },
    },
    host: {
      took: {
        ms: {
          type: 'long',
          _meta: {
            description: 'Execution time in milliseconds for the "host" task',
          },
        },
      },
    },
    processor_events: {
      took: {
        ms: {
          type: 'long',
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
          type: 'long',
          _meta: {
            description:
              'Execution time in milliseconds for the "agent_configuration" task',
          },
        },
      },
    },
    global_labels: {
      took: {
        ms: {
          type: 'long',
          _meta: {
            description:
              'Execution time in milliseconds for the "global_labels" task',
          },
        },
      },
    },
    services: {
      took: {
        ms: {
          type: 'long',
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
          type: 'long',
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
          type: 'long',
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
          type: 'long',
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
          type: 'long',
          _meta: {
            description: 'Execution time in milliseconds for the "agents" task',
          },
        },
      },
    },
    indices_stats: {
      took: {
        ms: {
          type: 'long',
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
          type: 'long',
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
          type: 'long',
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
          type: 'long',
          _meta: {
            description:
              'Execution time in milliseconds for the "service_groups" task',
          },
        },
      },
    },
    custom_dashboards: {
      took: {
        ms: {
          type: 'long',
          _meta: {
            description:
              'Execution time in milliseconds for the "custom_dashboards" task',
          },
        },
      },
    },
    per_service: {
      took: {
        ms: {
          type: 'long',
          _meta: {
            description:
              'Execution time in milliseconds for the "per_service" task',
          },
        },
      },
    },
    top_traces: {
      took: {
        ms: {
          type: 'long',
          _meta: {
            description:
              'Execution time in milliseconds for the "top_traces" task',
          },
        },
      },
    },
  },
};
