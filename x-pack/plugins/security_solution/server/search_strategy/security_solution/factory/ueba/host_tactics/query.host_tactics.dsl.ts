/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { HostTacticsRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../utils/build_query';

export const buildHostTacticsQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  hostName,
  timerange: { from, to },
}: HostTacticsRequestOptions) => {
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
        tactic: {
          terms: {
            field: 'signal.rule.threat.tactic.name',
          },
          aggs: {
            technique: {
              terms: {
                field: 'signal.rule.threat.technique.name',
              },
              aggs: {
                risk_score: {
                  sum: {
                    field: 'signal.rule.risk_score',
                  },
                },
              },
            },
          },
        },
        tactic_count: {
          cardinality: {
            field: 'signal.rule.threat.tactic.name',
          },
        },
        technique_count: {
          cardinality: {
            field: 'signal.rule.threat.technique.name',
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
