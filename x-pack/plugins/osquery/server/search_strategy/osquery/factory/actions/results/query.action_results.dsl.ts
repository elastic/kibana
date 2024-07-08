/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/search-types';
import { AGENT_ACTIONS_RESULTS_INDEX } from '@kbn/fleet-plugin/common';
import { isEmpty } from 'lodash';
import moment from 'moment';
import {
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  ACTION_RESPONSES_INDEX,
} from '../../../../../../common/constants';
import type { ActionResultsRequestOptions } from '../../../../../../common/search_strategy';
import { getQueryFilter } from '../../../../../utils/build_query';

export const buildActionResultsQuery = ({
  actionId,
  kuery,
  startDate,
  sort,
  componentTemplateExists,
  useNewDataStream,
}: ActionResultsRequestOptions): ISearchRequestParams => {
  let filter = `action_id: ${actionId}`;
  if (!isEmpty(kuery)) {
    filter = filter + ` AND ${kuery}`;
  }

  const timeRangeFilter =
    startDate && !isEmpty(startDate)
      ? [
          {
            range: {
              started_at: {
                gte: startDate,
                lte: moment(startDate).clone().add(30, 'minutes').toISOString(),
              },
            },
          },
        ]
      : [];

  const filterQuery = [...timeRangeFilter, getQueryFilter({ filter })];

  let index: string;
  if (useNewDataStream) {
    index = `${ACTION_RESPONSES_DATA_STREAM_INDEX}*`;
  } else if (componentTemplateExists) {
    index = `${ACTION_RESPONSES_INDEX}*`;
  } else {
    index = `${AGENT_ACTIONS_RESULTS_INDEX}*`;
  }

  return {
    allow_no_indices: true,
    index,
    ignore_unavailable: true,
    body: {
      aggs: {
        aggs: {
          global: {},
          aggs: {
            responses_by_action_id: {
              filter: {
                bool: {
                  must: [
                    {
                      match: {
                        action_id: actionId,
                      },
                    },
                  ],
                },
              },
              aggs: {
                rows_count: {
                  sum: {
                    field: 'action_response.osquery.count',
                  },
                },
                responses: {
                  terms: {
                    script: {
                      lang: 'painless',
                      source:
                        "if (doc['error.keyword'].size()==0) { return 'success' } else { return 'error' }",
                    } as const,
                  },
                },
              },
            },
          },
        },
      },
      query: { bool: { filter: filterQuery } },
      // from: activePage * querySize,
      size: 10000, // querySize,
      track_total_hits: true,
      fields: ['*'],
      sort: [
        {
          [sort.field]: {
            order: sort.direction,
          },
        },
      ],
    },
  };
};
