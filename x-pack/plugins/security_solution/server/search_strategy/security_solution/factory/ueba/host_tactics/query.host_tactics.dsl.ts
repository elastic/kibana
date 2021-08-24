/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RISK_SCORE } from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash/fp';
import {
  ALERT_RULE_THREAT_TACTIC_NAME,
  ALERT_RULE_THREAT_TECHNIQUE_NAME,
} from '../../../../../../../timelines/common/alerts';
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
            field: ALERT_RISK_SCORE,
          },
        },
        tactic: {
          terms: {
            field: ALERT_RULE_THREAT_TACTIC_NAME,
          },
          aggs: {
            technique: {
              terms: {
                field: ALERT_RULE_THREAT_TECHNIQUE_NAME,
              },
              aggs: {
                risk_score: {
                  sum: {
                    field: ALERT_RISK_SCORE,
                  },
                },
              },
            },
          },
        },
        tactic_count: {
          cardinality: {
            field: ALERT_RULE_THREAT_TACTIC_NAME,
          },
        },
        technique_count: {
          cardinality: {
            field: ALERT_RULE_THREAT_TECHNIQUE_NAME,
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
