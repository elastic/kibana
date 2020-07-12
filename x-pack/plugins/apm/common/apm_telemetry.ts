/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AGENT_NAMES } from './agent_name';

/**
 * Generate an object containing the mapping used for APM telemetry. Can be used
 * with the `upload-telemetry-data` script or to update the mapping in the
 * telemetry repository.
 *
 * This function breaks things up to make the mapping easier to understand.
 */
export function getApmTelemetryMapping() {
  const keyword = {
    type: 'keyword',
    ignore_above: 1024,
  };

  const long = {
    type: 'long',
  };

  const allProperties = {
    properties: {
      all: long,
    },
  };

  const oneDayProperties = {
    properties: {
      '1d': long,
    },
  };

  const oneDayAllProperties = {
    properties: {
      '1d': long,
      all: long,
    },
  };

  const msProperties = {
    properties: {
      ms: long,
    },
  };

  const tookProperties = {
    properties: {
      took: msProperties,
    },
  };

  const compositeNameVersionProperties = {
    properties: {
      composite: keyword,
      name: keyword,
      version: keyword,
    },
  };

  const agentProperties = {
    properties: { version: keyword },
  };

  const serviceProperties = {
    properties: {
      framework: compositeNameVersionProperties,
      language: compositeNameVersionProperties,
      runtime: compositeNameVersionProperties,
    },
  };

  return {
    properties: {
      agents: {
        properties: AGENT_NAMES.reduce<Record<string, any>>(
          (previousValue, currentValue) => {
            previousValue[currentValue] = {
              properties: {
                agent: agentProperties,
                service: serviceProperties,
              },
            };

            return previousValue;
          },
          {}
        ),
      },
      cloud: {
        properties: {
          availability_zone: keyword,
          provider: keyword,
          region: keyword,
        },
      },
      counts: {
        properties: {
          agent_configuration: allProperties,
          error: oneDayAllProperties,
          max_error_groups_per_service: oneDayProperties,
          max_transaction_groups_per_service: oneDayProperties,
          metric: oneDayAllProperties,
          onboarding: oneDayAllProperties,
          services: oneDayProperties,
          sourcemap: oneDayAllProperties,
          span: oneDayAllProperties,
          traces: oneDayProperties,
          transaction: oneDayAllProperties,
        },
      },
      cardinality: {
        properties: {
          user_agent: {
            properties: {
              original: {
                properties: {
                  all_agents: oneDayProperties,
                  rum: oneDayProperties,
                },
              },
            },
          },
          transaction: {
            properties: {
              name: {
                properties: {
                  all_agents: oneDayProperties,
                  rum: oneDayProperties,
                },
              },
            },
          },
        },
      },
      has_any_services: {
        type: 'boolean',
      },
      indices: {
        properties: {
          all: {
            properties: {
              total: {
                properties: {
                  docs: {
                    properties: {
                      count: long,
                    },
                  },
                  store: {
                    properties: {
                      size_in_bytes: long,
                    },
                  },
                },
              },
            },
          },
          shards: {
            properties: {
              total: long,
            },
          },
        },
      },
      integrations: {
        properties: {
          ml: {
            properties: {
              all_jobs_count: long,
            },
          },
        },
      },
      retainment: {
        properties: {
          error: msProperties,
          metric: msProperties,
          onboarding: msProperties,
          span: msProperties,
          transaction: msProperties,
        },
      },
      services_per_agent: {
        properties: AGENT_NAMES.reduce<Record<string, any>>(
          (previousValue, currentValue) => {
            previousValue[currentValue] = { ...long, null_value: 0 };
            return previousValue;
          },
          {}
        ),
      },
      tasks: {
        properties: {
          agent_configuration: tookProperties,
          agents: tookProperties,
          cardinality: tookProperties,
          cloud: tookProperties,
          groupings: tookProperties,
          indices_stats: tookProperties,
          integrations: tookProperties,
          processor_events: tookProperties,
          services: tookProperties,
          versions: tookProperties,
        },
      },
      version: {
        properties: {
          apm_server: {
            properties: {
              major: long,
              minor: long,
              patch: long,
            },
          },
        },
      },
    },
  };
}

export const apmTelemetrySchema = {
  agents: {
    dotnet: {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    go: {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    java: {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    'js-base': {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    nodejs: {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    python: {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    ruby: {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
    'rum-js': {
      agent: {
        version: { type: 'keyword' },
      },
      service: {
        framework: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        language: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
        runtime: {
          composite: { type: 'keyword' },
          name: { type: 'keyword' },
          version: { type: 'keyword' },
        },
      },
    },
  },
  cloud: {
    availability_zone: { type: 'keyword' },
    provider: { type: 'keyword' },
    region: { type: 'keyword' },
  },
  counts: {
    agent_configuration: {
      all: { type: 'long' },
    },
    error: {
      '1d': { type: 'long' },
      all: { type: 'long' },
    },
    max_error_groups_per_service: {
      '1d': { type: 'long' },
    },
    max_transaction_groups_per_service: {
      '1d': { type: 'long' },
    },
    metric: {
      '1d': { type: 'long' },
      all: { type: 'long' },
    },
    onboarding: {
      '1d': { type: 'long' },
      all: { type: 'long' },
    },
    services: {
      '1d': { type: 'long' },
    },
    sourcemap: {
      '1d': { type: 'long' },
      all: { type: 'long' },
    },
    span: {
      '1d': { type: 'long' },
      all: { type: 'long' },
    },
    traces: {
      '1d': { type: 'long' },
    },
    transaction: {
      '1d': { type: 'long' },
      all: { type: 'long' },
    },
  },
  cardinality: {
    user_agent: {
      original: {
        all_agents: {
          '1d': { type: 'long' },
        },
        rum: {
          '1d': { type: 'long' },
        },
      },
    },
    transaction: {
      name: {
        all_agents: {
          '1d': { type: 'long' },
        },
        rum: {
          '1d': { type: 'long' },
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
        docs: { count: { type: 'long' } },
        store: { size_in_bytes: { type: 'long' } },
      },
    },
    shards: { total: { type: 'long' } },
  },
  integrations: {
    ml: { all_jobs_count: { type: 'long' } },
  },
  retainment: {
    error: { ms: { type: 'long' } },
    metric: { ms: { type: 'long' } },
    onboarding: { ms: { type: 'long' } },
    span: { ms: { type: 'long' } },
    transaction: { ms: { type: 'long' } },
  },
  services_per_agent: {
    dotnet: { type: 'long' },
    go: { type: 'long' },
    java: { type: 'long' },
    'js-base': { type: 'long' },
    nodejs: { type: 'long' },
    python: { type: 'long' },
    ruby: { type: 'long' },
    'rum-js': { type: 'long' },
  },
  tasks: {
    agent_configuration: { took: { ms: { type: 'long' } } },
    agents: { took: { ms: { type: 'long' } } },
    cardinality: { took: { ms: { type: 'long' } } },
    cloud: { took: { ms: { type: 'long' } } },
    groupings: { took: { ms: { type: 'long' } } },
    indices_stats: { took: { ms: { type: 'long' } } },
    integrations: { took: { ms: { type: 'long' } } },
    processor_events: { took: { ms: { type: 'long' } } },
    services: { took: { ms: { type: 'long' } } },
    versions: { took: { ms: { type: 'long' } } },
  },
  version: {
    apm_server: {
      major: { type: 'long' },
      minor: { type: 'long' },
      patch: { type: 'long' },
    },
  },
};
