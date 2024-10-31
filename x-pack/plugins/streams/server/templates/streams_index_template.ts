/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import { STREAMS_BASE_COMPONENT } from './components/base';
import { STREAMS_INDEX } from '../../common/constants';

export const streamsIndexTemplate: IndicesPutIndexTemplateRequest = {
  name: 'stream-entities',
  _meta: {
    description:
      'Index template for indices managed by the Streams framework for the instance dataset',
    ecs_version: '8.0.0',
    managed: true,
    managed_by: 'streams',
  },
  composed_of: [STREAMS_BASE_COMPONENT],
  index_patterns: [STREAMS_INDEX],
  priority: 200,
  template: {
    mappings: {
      _meta: {
        version: '1.6.0',
      },
      date_detection: false,
      dynamic: false,
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
