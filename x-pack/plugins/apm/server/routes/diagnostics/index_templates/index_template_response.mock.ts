/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';

export const indexTemplateResponse: IndicesGetIndexTemplateResponse = {
  index_templates: [
    {
      name: 'traces-apm',
      index_template: {
        index_patterns: ['traces-apm-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'traces-apm@package',
          'traces-apm@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_transaction.60m',
      index_template: {
        index_patterns: ['metrics-apm.service_transaction.60m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_transaction.60m@package',
          'metrics-apm.service_transaction.60m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_destination.10m',
      index_template: {
        index_patterns: ['metrics-apm.service_destination.10m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_destination.10m@package',
          'metrics-apm.service_destination.10m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.transaction.1m',
      index_template: {
        index_patterns: ['metrics-apm.transaction.1m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.transaction.1m@package',
          'metrics-apm.transaction.1m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'logs-elastic_agent.apm_server',
      index_template: {
        index_patterns: ['logs-elastic_agent.apm_server-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'elastic_agent',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'logs-elastic_agent.apm_server@package',
          'logs-elastic_agent.apm_server@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'elastic_agent',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_destination.1m',
      index_template: {
        index_patterns: ['metrics-apm.service_destination.1m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_destination.1m@package',
          'metrics-apm.service_destination.1m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_transaction.10m',
      index_template: {
        index_patterns: ['metrics-apm.service_transaction.10m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_transaction.10m@package',
          'metrics-apm.service_transaction.10m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.profiling',
      index_template: {
        index_patterns: ['metrics-apm.profiling-*'],
        template: {
          settings: {
            index: {
              default_pipeline: 'metrics-apm.profiling-8.4.2',
            },
          },
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.profiling@package',
          'metrics-apm.profiling@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.transaction.60m',
      index_template: {
        index_patterns: ['metrics-apm.transaction.60m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.transaction.60m@package',
          'metrics-apm.transaction.60m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_transaction.1m',
      index_template: {
        index_patterns: ['metrics-apm.service_transaction.1m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_transaction.1m@package',
          'metrics-apm.service_transaction.1m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'logs-apm.error',
      index_template: {
        index_patterns: ['logs-apm.error-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'logs-apm.error@package',
          'logs-apm.error@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-elastic_agent.apm_server',
      index_template: {
        index_patterns: ['metrics-elastic_agent.apm_server-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'elastic_agent',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-elastic_agent.apm_server@package',
          'metrics-elastic_agent.apm_server@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'elastic_agent',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_destination.60m',
      index_template: {
        index_patterns: ['metrics-apm.service_destination.60m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_destination.60m@package',
          'metrics-apm.service_destination.60m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_summary.1m',
      index_template: {
        index_patterns: ['metrics-apm.service_summary.1m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_summary.1m@package',
          'metrics-apm.service_summary.1m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.transaction.10m',
      index_template: {
        index_patterns: ['metrics-apm.transaction.10m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.transaction.10m@package',
          'metrics-apm.transaction.10m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'traces-apm.rum',
      index_template: {
        index_patterns: ['traces-apm.rum-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'traces-apm.rum@package',
          'traces-apm.rum@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.internal',
      index_template: {
        index_patterns: ['metrics-apm.internal-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.internal@package',
          'metrics-apm.internal@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'traces-apm.sampled',
      index_template: {
        index_patterns: ['traces-apm.sampled-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'traces-apm.sampled@package',
          'traces-apm.sampled@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.app',
      index_template: {
        index_patterns: ['metrics-apm.app.*-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.app@package',
          'metrics-apm.app@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 150,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'metrics-apm.service_summary.10m',
      index_template: {
        index_patterns: ['metrics-apm.service_summary.10m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_summary.10m@package',
          'metrics-apm.service_summary.10m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'apm-source-map',
      index_template: {
        index_patterns: ['.apm-source-map'],
        template: {
          settings: {
            index: {
              hidden: 'true',
              number_of_shards: '1',
              auto_expand_replicas: '0-2',
            },
          },
          mappings: {
            dynamic: 'strict',
            properties: {
              'file.path': {
                type: 'keyword',
              },
              'service.name': {
                type: 'keyword',
              },
              'service.version': {
                type: 'keyword',
              },
              content_sha256: {
                type: 'keyword',
              },
              created: {
                type: 'date',
              },
              fleet_id: {
                type: 'keyword',
              },
              content: {
                type: 'binary',
              },
            },
          },
        },
        composed_of: [],
        version: 1,
      },
    },
    {
      name: 'metrics-apm.service_summary.60m',
      index_template: {
        index_patterns: ['metrics-apm.service_summary.60m-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'metrics-apm.service_summary.60m@package',
          'metrics-apm.service_summary.60m@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: true,
          allow_custom_routing: false,
        },
      },
    },
    {
      name: 'logs-apm.app',
      index_template: {
        index_patterns: ['logs-apm.app-*'],
        template: {
          settings: {},
          mappings: {
            _meta: {
              package: {
                name: 'apm',
              },
              managed_by: 'fleet',
              managed: true,
            },
          },
        },
        composed_of: [
          'logs-apm.app@package',
          'logs-apm.app@custom',
          '.fleet_globals-1',
          '.fleet_agent_id_verification-1',
        ],
        priority: 200,
        _meta: {
          package: {
            name: 'apm',
          },
          managed_by: 'fleet',
          managed: true,
        },
        data_stream: {
          hidden: false,
          allow_custom_routing: false,
        },
      },
    },
  ],
};
