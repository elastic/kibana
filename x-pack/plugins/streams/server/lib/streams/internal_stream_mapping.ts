/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { STREAMS_INDEX } from '../../../common/constants';

export function createStreamsIndex(scopedClusterClient: IScopedClusterClient) {
  return scopedClusterClient.asInternalUser.indices.create({
    index: STREAMS_INDEX,
    mappings: {
      dynamic: 'strict',
      properties: {
        processing: {
          type: 'object',
          enabled: false,
        },
        fields: {
          type: 'object',
          enabled: false,
        },
        children: {
          type: 'object',
          enabled: false,
        },
        id: {
          type: 'keyword',
        },
      },
    },
  });
}
