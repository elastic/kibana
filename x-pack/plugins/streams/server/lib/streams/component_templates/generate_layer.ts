/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { ASSET_VERSION } from '../../../../common/constants';

export function generateLayer(id: string): ClusterPutComponentTemplateRequest {
  return {
    name: `${id}@layer`,
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
    },
    version: ASSET_VERSION,
    _meta: {
      managed: true,
      description: `Default settings for the ${id} StreamEntity`,
    },
  };
}
