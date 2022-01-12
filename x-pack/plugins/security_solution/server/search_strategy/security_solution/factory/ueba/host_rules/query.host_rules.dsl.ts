/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { ALERT_RISK_SCORE, ALERT_RULE_NAME, ALERT_RULE_TYPE } from '@kbn/rule-data-utils';
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
    allow_no_indices: true,
    index: defaultIndex, // can stop getting this from sourcerer and assume default detections index if we want
    ignore_unavailable: true,
    track_total_hits: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggs: {
        risk_score: {
          sum: {
            field: ALERT_RISK_SCORE,
          },
        },
        rule_name: {
          terms: {
            field: ALERT_RULE_NAME,
            order: {
              risk_score: Direction.desc,
            },
          },
          aggs: {
            risk_score: {
              sum: {
                field: ALERT_RISK_SCORE,
              },
            },
            rule_type: {
              terms: {
                field: ALERT_RULE_TYPE,
              },
            },
          },
        },
        rule_count: {
          cardinality: {
            field: ALERT_RULE_NAME,
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
