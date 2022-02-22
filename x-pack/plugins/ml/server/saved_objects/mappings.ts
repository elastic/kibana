/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsTypeMappingDefinition } from 'kibana/server';

export const mlJob: SavedObjectsTypeMappingDefinition = {
  properties: {
    job_id: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    datafeed_id: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    type: {
      type: 'keyword',
    },
  },
};

export const mlTrainedModel: SavedObjectsTypeMappingDefinition = {
  properties: {
    model_id: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    job: {
      properties: {
        job_id: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
            },
          },
        },
        create_time: {
          type: 'date',
        },
      },
    },
  },
};

export const mlModule: SavedObjectsTypeMappingDefinition = {
  dynamic: false,
  properties: {
    id: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    title: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    description: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    type: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    logo: {
      type: 'object',
    },
    defaultIndexPattern: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
        },
      },
    },
    query: {
      type: 'object',
    },
    jobs: {
      type: 'object',
    },
    datafeeds: {
      type: 'object',
    },
  },
};
