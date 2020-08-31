/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { produce } from 'immer';
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

  const aggregatedTransactionsProperties = {
    properties: {
      expected_metric_document_count: long,
      transaction_count: long,
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
      aggregated_transactions: {
        properties: {
          current_implementation: aggregatedTransactionsProperties,
          no_observer_name: aggregatedTransactionsProperties,
          no_rum: aggregatedTransactionsProperties,
          no_rum_no_observer_name: aggregatedTransactionsProperties,
          only_rum: aggregatedTransactionsProperties,
          only_rum_no_observer_name: aggregatedTransactionsProperties,
        },
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
          client: {
            properties: {
              geo: {
                properties: {
                  country_iso_code: { properties: { rum: oneDayProperties } },
                },
              },
            },
          },
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
          aggregated_transactions: tookProperties,
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

/**
 * Merge a telemetry mapping object (from https://github.com/elastic/telemetry/blob/master/config/templates/xpack-phone-home.json)
 * with the output from `getApmTelemetryMapping`.
 */
export function mergeApmTelemetryMapping(
  xpackPhoneHomeMapping: Record<string, any>
) {
  return produce(xpackPhoneHomeMapping, (draft: Record<string, any>) => {
    draft.mappings.properties.stack_stats.properties.kibana.properties.plugins.properties.apm = getApmTelemetryMapping();
    return draft;
  });
}
