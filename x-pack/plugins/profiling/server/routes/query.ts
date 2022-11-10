/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslBoolQuery } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { kqlQuery } from '@kbn/observability-plugin/server';
import { ProfilingESField } from '../../common/elasticsearch';

export interface ProjectTimeQuery {
  bool: QueryDslBoolQuery;
}

export function createCommonFilter({
  kuery,
  timeFrom,
  timeTo,
}: {
  kuery: string;
  timeFrom: number;
  timeTo: number;
}): ProjectTimeQuery {
  return {
    bool: {
      filter: [
        ...kqlQuery(kuery),
        {
          range: {
            [ProfilingESField.Timestamp]: {
              gte: String(timeFrom),
              lt: String(timeTo),
              format: 'epoch_second',
              boost: 1.0,
            },
          },
        },
      ],
    },
  };
}
