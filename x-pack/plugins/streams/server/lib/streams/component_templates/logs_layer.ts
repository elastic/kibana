/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesIndexSettings } from '@elastic/elasticsearch/lib/api/types';

export const logsSettings: IndicesIndexSettings = {
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
};
