/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { AGENT_NAME } from '../../../common/elasticsearch_fieldnames';
import { RUM_AGENT_NAMES } from '../../../common/agent_name';

// exclude RUM exit spans, as they're high cardinality and don't usually
// talk to databases directly

export function excludeRumExitSpansQuery() {
  return [
    {
      bool: {
        must_not: [
          {
            terms: {
              [AGENT_NAME]: RUM_AGENT_NAMES,
            },
          },
        ],
      },
    },
  ] as QueryDslQueryContainer[];
}
