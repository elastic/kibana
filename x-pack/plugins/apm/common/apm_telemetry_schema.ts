/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const apmSchema = {
  agents: {
    dotnet: {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    go: {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    java: {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    'js-base': {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    nodejs: {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    python: {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    ruby: {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
    'rum-js': {
      agent: {
        version: {
          type: 'keyword',
        },
      },
      service: {
        framework: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        language: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
        runtime: {
          composite: {
            type: 'keyword',
          },
          name: {
            type: 'keyword',
          },
          version: {
            type: 'keyword',
          },
        },
      },
    },
  },
  cloud: {
    availability_zone: {
      type: 'keyword',
    },
    provider: {
      type: 'keyword',
    },
    region: {
      type: 'keyword',
    },
  },
  counts: {
    agent_configuration: {
      all: {
        type: 'long',
      },
    },
    error: {
      '1d': {
        type: 'long',
      },
      all: {
        type: 'long',
      },
    },
    max_error_groups_per_service: {
      '1d': {
        type: 'long',
      },
    },
    max_transaction_groups_per_service: {
      '1d': {
        type: 'long',
      },
    },
    metric: {
      '1d': {
        type: 'long',
      },
      all: {
        type: 'long',
      },
    },
    onboarding: {
      '1d': {
        type: 'long',
      },
      all: {
        type: 'long',
      },
    },
    services: {
      '1d': {
        type: 'long',
      },
    },
    sourcemap: {
      '1d': {
        type: 'long',
      },
      all: {
        type: 'long',
      },
    },
    span: {
      '1d': {
        type: 'long',
      },
      all: {
        type: 'long',
      },
    },
    traces: {
      '1d': {
        type: 'long',
      },
    },
    transaction: {
      '1d': {
        type: 'long',
      },
      all: {
        type: 'long',
      },
    },
  },
  cardinality: {
    user_agent: {
      original: {
        all_agents: {
          '1d': {
            type: 'long',
          },
        },
        rum: {
          '1d': {
            type: 'long',
          },
        },
      },
    },
    transaction: {
      name: {
        all_agents: {
          '1d': {
            type: 'long',
          },
        },
        rum: {
          '1d': {
            type: 'long',
          },
        },
      },
    },
  },
  has_any_services: {
    type: 'boolean',
  },
  indices: {
    all: {
      total: {
        docs: {
          count: {
            type: 'long',
          },
        },
        store: {
          size_in_bytes: {
            type: 'long',
          },
        },
      },
    },
    shards: {
      total: {
        type: 'long',
      },
    },
  },
  integrations: {
    ml: {
      all_jobs_count: {
        type: 'long',
      },
    },
  },
  retainment: {
    error: {
      ms: {
        type: 'long',
      },
    },
    metric: {
      ms: {
        type: 'long',
      },
    },
    onboarding: {
      ms: {
        type: 'long',
      },
    },
    span: {
      ms: {
        type: 'long',
      },
    },
    transaction: {
      ms: {
        type: 'long',
      },
    },
  },
  services_per_agent: {
    dotnet: {
      type: 'long',
      null_value: 0,
    },
    go: {
      type: 'long',
      null_value: 0,
    },
    java: {
      type: 'long',
      null_value: 0,
    },
    'js-base': {
      type: 'long',
      null_value: 0,
    },
    nodejs: {
      type: 'long',
      null_value: 0,
    },
    python: {
      type: 'long',
      null_value: 0,
    },
    ruby: {
      type: 'long',
      null_value: 0,
    },
    'rum-js': {
      type: 'long',
      null_value: 0,
    },
  },
  tasks: {
    agent_configuration: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    agents: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    cardinality: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    cloud: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    groupings: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    indices_stats: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    integrations: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    processor_events: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    services: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
    versions: {
      took: {
        ms: {
          type: 'long',
        },
      },
    },
  },
  version: {
    apm_server: {
      major: {
        type: 'long',
      },
      minor: {
        type: 'long',
      },
      patch: {
        type: 'long',
      },
    },
  },
};
