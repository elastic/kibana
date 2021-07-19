/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_MAX_TABLE_QUERY_SIZE, showAllOthersBucket } from '../../../../../common/constants';
import * as i18n from './translations';

export const getAlertsCountQuery = (
  stackByField: string,
  from: string,
  to: string,
  additionalFilters: Array<{
    bool: { filter: unknown[]; should: unknown[]; must_not: unknown[]; must: unknown[] };
  }>
) => {
  const missing = showAllOthersBucket.includes(stackByField)
    ? {
        missing: stackByField.endsWith('.ip') ? '0.0.0.0' : i18n.ALL_OTHERS,
      }
    : {};

  return {
    size: 0,
    aggs: {
      alertsByGroupingCount: {
        terms: {
          field: stackByField,
          ...missing,
          order: {
            _count: 'desc',
          },
          size: DEFAULT_MAX_TABLE_QUERY_SIZE,
        },
      },
    },
    query: {
      bool: {
        filter: [
          ...additionalFilters,
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
  };
};
