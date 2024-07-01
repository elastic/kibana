/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/server';

export const fleetAgentsSchema: RootSchema<any> = {
  agents_per_version: {
    _meta: {
      description: 'Agents per version telemetry',
      optional: true,
    },
    properties: {
      version: {
        type: 'keyword',
        _meta: {
          description: 'Agent version enrolled to this kibana',
        },
      },
      count: {
        type: 'long',
        _meta: {
          description: 'Number of agents enrolled that use this version',
        },
      },
      healthy: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents in a healthy state',
        },
      },
      unhealthy: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents in an unhealthy state',
        },
      },
      updating: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents in an updating state',
        },
      },
      offline: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents currently offline',
        },
      },
      inactive: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents currently inactive',
        },
      },
      unenrolled: {
        type: 'long',
        _meta: {
          description: 'The total number of unenrolled agents',
        },
      },
    },
  },
  agents_per_output_type: {
    _meta: {
      description: 'Agents per output type telemetry',
      optional: true,
    },
    properties: {
      output_type: {
        type: 'keyword',
        _meta: {
          description: 'Output type used by agent',
        },
      },
      preset_counts: {
        _meta: {
          description: 'Count of agents per preset',
          optional: true,
        },
        properties: {
          balanced: {
            type: 'long',
            _meta: {
              description: 'Number of agents enrolled whose output uses the balanced preset',
            },
          },
          custom: {
            type: 'long',
            _meta: {
              description: 'Number of agents enrolled whose outputs uses the custom preset',
            },
          },
          throughput: {
            type: 'long',
            _meta: {
              description: 'Number of agents enrolled whose output uses the throughput preset',
            },
          },
          scale: {
            type: 'long',
            _meta: {
              description: 'Number of agents enrolled whose output uses the scale preset',
            },
          },
          latency: {
            type: 'long',
            _meta: {
              description: 'Number of agents enrolled whose output uses the latency preset',
            },
          },
        },
      },
      output_preset: {
        type: 'keyword',
        _meta: {
          description: 'Output preset used by agent, if applicable',
          optional: true,
        },
      },
      count_as_data: {
        type: 'long',
        _meta: {
          description: 'Number of agents enrolled that use this output type as data output',
        },
      },
      count_as_monitoring: {
        type: 'long',
        _meta: {
          description: 'Number of agents enrolled that use this output type as monitoring output',
        },
      },
    },
  },
  agents_per_privileges: {
    _meta: {
      description: 'Agents per privileges telemetry',
      optional: true,
    },
    properties: {
      root: {
        type: 'long',
        _meta: {
          description: 'Number of agents running with root privilege',
        },
      },
      unprivileged: {
        type: 'long',
        _meta: {
          description: 'Number of agents running without root privilege',
        },
      },
    },
  },
  upgrade_details: {
    _meta: {
      description: 'Agent upgrade details telemetry',
      optional: true,
    },
    properties: {
      target_version: {
        type: 'keyword',
        _meta: {
          description: 'Target version of the agent upgrade',
        },
      },
      state: {
        type: 'keyword',
        _meta: {
          description: 'State of the agent upgrade',
        },
      },
      error_msg: {
        type: 'keyword',
        _meta: {
          description: 'Error message of the agent upgrade if failed',
        },
      },
      agent_count: {
        type: 'long',
        _meta: {
          description: 'How many agents have this upgrade details',
        },
      },
    },
  },
};

export const fleetUsagesSchema: RootSchema<any> = {
  agents_enabled: { type: 'boolean', _meta: { description: 'agents enabled' } },
  agents: {
    properties: {
      total_enrolled: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents, in any state',
        },
      },
      healthy: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents in a healthy state',
        },
      },
      unhealthy: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents in an unhealthy state',
        },
      },
      updating: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents in an updating state',
        },
      },
      offline: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents currently offline',
        },
      },
      inactive: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled agents currently inactive',
        },
      },
      unenrolled: {
        type: 'long',
        _meta: {
          description: 'The total number of unenrolled agents',
        },
      },
      total_all_statuses: {
        type: 'long',
        _meta: {
          description: 'The total number of agents in any state, both enrolled and inactive',
        },
      },
    },
  },
  fleet_server: {
    properties: {
      total_enrolled: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled Fleet Server agents, in any state',
        },
      },
      total_all_statuses: {
        type: 'long',
        _meta: {
          description:
            'The total number of Fleet Server agents in any state, both enrolled and inactive.',
        },
      },
      healthy: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled Fleet Server agents in a healthy state.',
        },
      },
      unhealthy: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled Fleet Server agents in an unhealthy state',
        },
      },
      updating: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled Fleet Server agents in an updating state',
        },
      },
      offline: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled Fleet Server agents currently offline',
        },
      },
      inactive: {
        type: 'long',
        _meta: {
          description: 'The total number of enrolled Fleet Server agents currently inactive',
        },
      },
      unenrolled: {
        type: 'long',
        _meta: {
          description: 'The total number of unenrolled Fleet Server agents',
        },
      },
      num_host_urls: {
        type: 'long',
        _meta: {
          description: 'The number of Fleet Server hosts configured in Fleet settings.',
        },
      },
    },
  },
  packages: {
    type: 'array',
    items: {
      properties: {
        name: { type: 'keyword' },
        version: { type: 'keyword' },
        enabled: { type: 'boolean' },
      },
    },
  },
  agents_per_policy: {
    type: 'array',
    items: {
      type: 'long',
      _meta: { description: 'Agent counts enrolled per agent policy.' },
    },
  },
  fleet_server_config: {
    properties: {
      policies: {
        type: 'array',
        items: {
          properties: {
            input_config: { type: 'pass_through' },
          },
        },
      },
    },
  },
  agent_policies: {
    properties: {
      count: {
        type: 'long',
        _meta: {
          description: 'Number of agent policies',
        },
      },
      output_types: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'Output types of agent policies' },
        },
      },
      count_with_global_data_tags: {
        type: 'long',
        _meta: {
          description: 'Number of agent policies using global data tags',
        },
      },
      avg_number_global_data_tags_per_policy: {
        type: 'long',
        _meta: {
          description:
            'Average number of global data tags defined per agent policy (accross policies using global data tags)',
        },
      },
    },
  },
  agent_checkin_status: {
    properties: {
      error: {
        type: 'long',
        _meta: {
          description: 'Count of agent last checkin status error',
        },
      },
      degraded: {
        type: 'long',
        _meta: {
          description: 'Count of agent last checkin status degraded',
        },
      },
    },
  },
  agent_logs_panics_last_hour: {
    type: 'array',
    _meta: {
      description: 'Array of log messages containing the word panic from the last hour',
    },
    items: {
      properties: {
        timestamp: {
          type: 'date',
          _meta: {
            description: 'Timestamp of the log message containing the word panic',
          },
        },
        message: {
          type: 'text',
          _meta: {
            description: 'Log message containing the word panic',
          },
        },
      },
    },
  },
  agent_logs_top_errors: {
    type: 'array',
    items: {
      type: 'text',
      _meta: { description: 'Top messages from agent error logs' },
    },
  },
  fleet_server_logs_top_errors: {
    type: 'array',
    items: {
      type: 'text',
      _meta: { description: 'Top messages from fleet server error logs' },
    },
  },
  agents_per_os: {
    type: 'array',
    items: {
      properties: {
        name: {
          type: 'keyword',
          _meta: {
            description: 'Agent OS enrolled to this kibana',
          },
        },
        version: {
          type: 'keyword',
          _meta: {
            description: 'Agent OS version enrolled to this kibana',
          },
        },
        count: {
          type: 'long',
          _meta: {
            description: 'Number of agents enrolled that use this OS',
          },
        },
      },
    },
  },
  license_issued_to: {
    type: 'text',
    _meta: { description: 'The name of the user the license is issued to' },
  },
  deployment_id: {
    type: 'keyword',
    _meta: { description: 'id of the deployment', optional: true },
  },
};
