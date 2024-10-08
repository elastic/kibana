/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { kqlQuery } from '@kbn/observability-utils-common/es/queries/kql_query';

export function getEsqlRequest({
  query,
  start,
  end,
  kuery,
  dslFilter,
  timestampField,
}: {
  query: string;
  start?: number;
  end?: number;
  kuery?: string;
  dslFilter?: QueryDslQueryContainer[];
  timestampField?: string;
}) {
  return {
    query,
    filter: {
      bool: {
        filter: [
          ...(start && end
            ? [
                {
                  range: {
                    [timestampField ?? '@timestamp']: {
                      gte: start,
                      lte: end,
                    },
                  },
                },
              ]
            : []),
          ...excludeFrozenQuery(),
          ...kqlQuery(kuery),
          ...(dslFilter ?? []),
        ],
      },
    },
  };
}
