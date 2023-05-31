/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { OSQUERY_ACTIONS_INDEX } from '@kbn/osquery-plugin/common/constants';
import type { ActionRequestOptions } from '../../../../../../common/search_strategy/security_solution/response_actions';
import { ENDPOINT_ACTIONS_INDEX } from '../../../../../../common/endpoint/constants';

const EndpointFieldsLimited = [
  'EndpointActions.action_id',
  'EndpointActions.input_type',
  'EndpointActions.expiration',
  'EndpointActions.data.command',
];

export const buildResponseActionsQuery = ({
  alertIds,
  sort,
  canAccessEndpointActionsLogManagement,
}: ActionRequestOptions): ISearchRequestParams => {
  const fields = !canAccessEndpointActionsLogManagement
    ? ['@timestamp', 'action_id', 'input_type', ...EndpointFieldsLimited]
    : [{ field: '*' }, { field: 'EndpointActions.*', include_unmapped: true }];

  const dslQuery = {
    allow_no_indices: true,
    index: [ENDPOINT_ACTIONS_INDEX, OSQUERY_ACTIONS_INDEX],
    ignore_unavailable: true,
    body: {
      fields,
      query: {
        bool: {
          minimum_should_match: 2,
          should: [
            { term: { type: 'INPUT_ACTION' } },
            { terms: { alert_ids: alertIds } },
            {
              terms: { 'data.alert_id': alertIds },
            },
          ] as estypes.QueryDslQueryContainer[],
        },
      },
      sort: [
        {
          [sort.field]: {
            order: sort.order,
          },
        },
      ],
    },
  };

  return dslQuery;
};
