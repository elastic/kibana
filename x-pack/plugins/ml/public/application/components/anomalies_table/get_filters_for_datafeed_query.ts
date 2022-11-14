/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { SerializableRecord } from '@kbn/utility-types';
import { FilterStateStore } from '@kbn/es-query';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEqual } from 'lodash';

const defaultEmptyQuery = { bool: { must: [{ match_all: {} }] } };

export const getFiltersForDSLQuery = (
  datafeedQuery: QueryDslQueryContainer,
  dataViewId: string | null,
  alias?: string
) => {
  if (
    datafeedQuery &&
    !isPopulatedObject(datafeedQuery, ['match_all']) &&
    !isEqual(datafeedQuery, defaultEmptyQuery) &&
    dataViewId !== null
  ) {
    return [
      {
        meta: {
          index: dataViewId,
          ...(!!alias ? { alias } : {}),
          negate: false,
          disabled: false,
          type: 'custom',
          value: JSON.stringify(datafeedQuery),
        },
        query: datafeedQuery as SerializableRecord,
        $state: {
          store: FilterStateStore.APP_STATE,
        },
      },
    ];
  }
  return [];
};
