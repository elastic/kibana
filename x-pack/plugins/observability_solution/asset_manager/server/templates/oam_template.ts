/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const oamIndexTemplateConfig: IndicesPutIndexTemplateRequest = {
  name: 'oam_v1_index_template',
  _meta: {
    description: 'The OAM index template',
    ecs_version: '8.0.0',
  },
  composed_of: ['oam_v1_base', 'oam_v1_event', 'oam_v1_asset'],
  index_patterns: ['.oam-observability.asset-v1.*'],
  priority: 1,
  template: {
    mappings: {
      _meta: {
        version: '1.6.0',
      },
      date_detection: false,
      dynamic_templates: [
        {
          strings_as_keyword: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
            match_mapping_type: 'string',
          },
        },
        {
          asset_metrics: {
            mapping: {
              type: '{dynamic_type}',
            },
            match_mapping_type: ['long', 'double'],
            path_match: 'asset.metric.*',
          },
        },
      ],
    },
    settings: {
      index: {
        codec: 'best_compression',
        mapping: {
          total_fields: {
            limit: 2000,
          },
        },
      },
    },
  },
};
