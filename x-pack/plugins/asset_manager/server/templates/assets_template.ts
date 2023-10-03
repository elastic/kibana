/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';

export const assetsIndexTemplateConfig: IndicesPutIndexTemplateRequest = {
  name: 'assets',
  priority: 100,
  data_stream: {},
  template: {
    settings: {},
    mappings: {
      dynamic_templates: [
        {
          strings_as_keywords: {
            mapping: {
              ignore_above: 1024,
              type: 'keyword',
            },
            match_mapping_type: 'string',
          },
        },
      ],
      properties: {
        '@timestamp': {
          type: 'date',
        },
        asset: {
          type: 'object',
          // subobjects appears to not exist in the types, but is a valid ES mapping option
          // see: https://www.elastic.co/guide/en/elasticsearch/reference/master/subobjects.html
          // @ts-ignore
          subobjects: false,
        },
      },
    },
  },
};
