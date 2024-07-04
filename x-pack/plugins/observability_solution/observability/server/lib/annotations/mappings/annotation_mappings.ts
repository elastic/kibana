/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Mappings } from '../../../utils/create_or_update_index';

export const ANNOTATION_MAPPINGS: Mappings = {
  dynamic: true,
  properties: {
    annotation: {
      properties: {
        type: {
          type: 'keyword',
        },
        style: {
          type: 'flattened',
        },
      },
    },
    message: {
      type: 'text',
    },
    tags: {
      type: 'keyword',
    },
    '@timestamp': {
      type: 'date',
    },
    '@timestampEnd': {
      type: 'date',
    },
    event: {
      properties: {
        created: {
          type: 'date',
        },
      },
    },
    service: {
      properties: {
        name: {
          type: 'keyword',
        },
        environment: {
          type: 'keyword',
        },
        version: {
          type: 'keyword',
        },
      },
    },
    hosts: {
      type: 'nested',
      properties: {
        name: {
          type: 'keyword',
        },
      },
    },
    slos: {
      type: 'nested',
      properties: {
        id: {
          type: 'keyword',
        },
        instanceId: {
          type: 'keyword',
        },
      },
    },
    monitors: {
      type: 'nested',
      properties: {
        id: {
          type: 'keyword',
        },
      },
    },
    alerts: {
      type: 'nested',
      properties: {
        id: {
          type: 'keyword',
        },
      },
    },
  },
};
