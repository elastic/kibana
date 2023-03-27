/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import {
  ENDPOINT_ACTIONS_INDEX,
  OSQUERY_ACTIONS_INDEX,
} from '../../../../../../common/endpoint/constants';

export const buildActionsQuery = ({ alertIds, sort }: any): ISearchRequestParams => {
  // }: AgentsRequestOptions): ISearchRequestParams => {

  console.log('1111');
  const dslQuery = {
    allow_no_indices: true,
    index: [ENDPOINT_ACTIONS_INDEX, OSQUERY_ACTIONS_INDEX],
    ignore_unavailable: true,
    body: {
      query: {
        bool: {
          minimum_should_match: 2,
          should: [
            { term: { type: 'INPUT_ACTION' } },
            { terms: { alert_ids: alertIds } },
            {
              terms: { 'EndpointActions.data.alert_ids': alertIds },
            },
          ] as estypes.QueryDslQueryContainer[],
        },
      },
      sort: [
        {
          [sort.field]: {
            order: sort.direction,
          },
        },
      ],
    },
  };

  return dslQuery;
};
