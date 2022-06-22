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
          type: 'text',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      },
    },
    agent: {
      properties: {
        id: {
          type: 'text',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      },
    },
    '@timestamp': {
      type: 'date',
    },
    cycle_id: {
      type: 'text',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
    resource: {
      properties: {
        type: {
          type: 'keyword',
          ignore_above: 1024,
        },
        id: {
          type: 'keyword',
          ignore_above: 1024,
        },
        name: {
          type: 'keyword',
          ignore_above: 1024,
          fields: {
            text: {
              type: 'text',
            },
          },
        },
        sub_type: {
          ignore_above: 1024,
          type: 'keyword',
          fields: {
            text: {
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
        id: {
          ignore_above: 1024,
          type: 'keyword',
        },
        benchmark: {
          properties: {
            name: {
              type: 'text',
              fields: {
                keyword: {
                  ignore_above: 1024,
                  type: 'keyword',
                },
              },
            },
          },
        },
        section: {
          type: 'text',
          fields: {
            keyword: {
              ignore_above: 1024,
              type: 'keyword',
            },
          },
        },
      },
    },
    cluster_id: {
      type: 'text',
      fields: {
        keyword: {
          ignore_above: 1024,
          type: 'keyword',
        },
      },
    },
  },
};
