/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ASSET_VERSION } from '../../../../common/constants';

export const logsAllLayer: ClusterPutComponentTemplateRequest = {
  name: 'logs-all@layer',
  template: {
    settings: {
      index: {
        lifecycle: {
          name: 'logs',
        },
        codec: 'best_compression',
        mapping: {
          total_fields: {
            ignore_dynamic_beyond_limit: true,
          },
          ignore_malformed: true,
        },
      },
    },
    mappings: {
      dynamic: false,
      date_detection: false,
      properties: {
        '@timestamp': {
          type: 'date',
        },
        'data_stream.namespace': {
          type: 'constant_keyword',
        },
        'data_stream.dataset': {
          type: 'constant_keyword',
          value: 'all',
        },
        'data_stream.type': {
          type: 'constant_keyword',
          value: 'logs',
        },

        // Base
        labels: {
          type: 'object',
        },
        message: {
          type: 'match_only_text',
        },
        tags: {
          ignore_above: 1024,
          type: 'keyword',
        },
        event: {
          properties: {
            ingested: {
              type: 'date',
            },
          },
        },

        // Host
        host: {
          properties: {
            architecture: {
              ignore_above: 1024,
              type: 'keyword',
            },
            cpu: {
              properties: {
                usage: {
                  scaling_factor: 1000,
                  type: 'scaled_float',
                },
              },
            },
            disk: {
              properties: {
                read: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                  },
                },
                write: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            domain: {
              ignore_above: 1024,
              type: 'keyword',
            },
            geo: {
              properties: {
                city_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                continent_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                continent_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                country_iso_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                country_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                location: {
                  type: 'geo_point',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                postal_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region_iso_code: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region_name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                timezone: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            hostname: {
              ignore_above: 1024,
              type: 'keyword',
            },
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            ip: {
              type: 'ip',
            },
            mac: {
              ignore_above: 1024,
              type: 'keyword',
            },
            name: {
              ignore_above: 1024,
              type: 'keyword',
            },
            network: {
              properties: {
                egress: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    packets: {
                      type: 'long',
                    },
                  },
                },
                ingress: {
                  properties: {
                    bytes: {
                      type: 'long',
                    },
                    packets: {
                      type: 'long',
                    },
                  },
                },
              },
            },
            os: {
              properties: {
                family: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                full: {
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                  ignore_above: 1024,
                  type: 'keyword',
                },
                kernel: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  fields: {
                    text: {
                      type: 'match_only_text',
                    },
                  },
                  ignore_above: 1024,
                  type: 'keyword',
                },
                platform: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                version: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            uptime: {
              type: 'long',
            },
          },
        },

        // Orchestrator
        orchestrator: {
          properties: {
            api_version: {
              ignore_above: 1024,
              type: 'keyword',
            },
            cluster: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                url: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                version: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            namespace: {
              ignore_above: 1024,
              type: 'keyword',
            },
            organization: {
              ignore_above: 1024,
              type: 'keyword',
            },
            resource: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },

        log: {
          properties: {
            file: {
              properties: {
                path: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            level: {
              ignore_above: 1024,
              type: 'keyword',
            },
            logger: {
              ignore_above: 1024,
              type: 'keyword',
            },
            origin: {
              properties: {
                file: {
                  properties: {
                    line: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                function: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            syslog: {
              properties: {
                facility: {
                  properties: {
                    code: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                priority: {
                  type: 'long',
                },
                severity: {
                  properties: {
                    code: {
                      type: 'long',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
              },
              type: 'object',
            },
          },
        },

        // ECS
        ecs: {
          properties: {
            version: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },

        // Agent
        agent: {
          properties: {
            build: {
              properties: {
                original: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            ephemeral_id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            id: {
              ignore_above: 1024,
              type: 'keyword',
            },
            name: {
              ignore_above: 1024,
              type: 'keyword',
            },
            type: {
              ignore_above: 1024,
              type: 'keyword',
            },
            version: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },

        // Cloud
        cloud: {
          properties: {
            account: {
              properties: {
                id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            availability_zone: {
              ignore_above: 1024,
              type: 'keyword',
            },
            instance: {
              properties: {
                id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            machine: {
              properties: {
                type: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            origin: {
              properties: {
                account: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                availability_zone: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                instance: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                machine: {
                  properties: {
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                project: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                provider: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                service: {
                  properties: {
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
              },
            },
            project: {
              properties: {
                id: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            provider: {
              ignore_above: 1024,
              type: 'keyword',
            },
            region: {
              ignore_above: 1024,
              type: 'keyword',
            },
            service: {
              properties: {
                name: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
            target: {
              properties: {
                account: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                availability_zone: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                instance: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                machine: {
                  properties: {
                    type: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                project: {
                  properties: {
                    id: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
                provider: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                region: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
                service: {
                  properties: {
                    name: {
                      ignore_above: 1024,
                      type: 'keyword',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  version: ASSET_VERSION,
  _meta: {
    managed: true,
    description: 'Default layer for logs-all StreamEntity',
  },
  deprecated: false,
};
