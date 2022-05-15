/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export const latestFindingsMapping: MappingTypeMapping = {
  properties: {
    result: {
      properties: {
        evaluation: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'text',
            },
          },
        },
      },
    },
    agent: {
      properties: {
        id: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'text',
            },
          },
        },
      },
    },
    '@timestamp': {
      type: 'date',
    },
    cycle_id: {
      type: 'keyword',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'text',
        },
      },
    },
    resource: {
      properties: {
        type: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 256,
              type: 'text',
            },
          },
        },
        id: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 256,
              type: 'text',
            },
          },
        },
        name: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'text',
            },
          },
        },
        sub_type: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'text',
            },
          },
        },
        raw: {
          type: 'object',
          enabled: false,
        },
      },
    },
    resource_id: {
      // deprecated - the new field is resource.id
      type: 'keyword',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'text',
        },
      },
    },
    rule: {
      properties: {
        name: {
          ignore_above: 1024,
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
        benchmark: {
          properties: {
            name: {
              type: 'keyword',
              fields: {
                keyword: {
                  ignore_above: 1024,
                  type: 'text',
                },
              },
            },
          },
        },
        section: {
          type: 'keyword',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'text',
            },
          },
        },
      },
    },
    cluster_id: {
      type: 'keyword',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'text',
        },
      },
    },
  },
};
