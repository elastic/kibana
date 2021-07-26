/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { Direction, HostRulesRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildHostRulesQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  hostName,
  timerange: { from, to },
}: HostRulesRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  return {
    allowNoIndices: true,
    index: defaultIndex, // can stop getting this from sourcerer and assume default detections index if we want
    ignoreUnavailable: true,
    track_total_hits: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggs: {
        risk_score: {
          sum: {
            field: 'signal.rule.risk_score',
          },
        },
        rule_name: {
          terms: {
            field: 'signal.rule.name',
            order: {
              risk_score: Direction.desc,
            },
          },
          aggs: {
            risk_score: {
              sum: {
                field: 'signal.rule.risk_score',
              },
            },
            rule_type: {
              terms: {
                field: 'signal.rule.type',
              },
            },
          },
        },
        rule_count: {
          cardinality: {
            field: 'signal.rule.name',
          },
        },
      },
      query: {
        bool: {
          filter,
          must: [
            {
              term: {
                'host.name': hostName,
              },
            },
          ],
        },
      },
      size: 0,
    },
  };
};
