/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
import { ResultsRequestOptions } from '../../../../../common/search_strategy';
// import { createQueryFilterClauses } from '../../../../../common/utils/build_query';

export const buildAlertsHostsQuery = ({
  // @ts-expect-error update types
  indices,
  // @ts-expect-error update types
  alertIds,
}: // actionId,
// agentId,
// filterQuery,
// sort,
// pagination: { activePage, querySize },
ResultsRequestOptions): ISearchRequestParams => {
  const dslQuery = {
    allowNoIndices: true,
    index: indices.join(','),
    ignoreUnavailable: true,
    body: {
      query: {
        ids: {
          values: alertIds,
        },
      },
      aggs: {
        hosts: {
          terms: { field: 'host.name' },
        },
      },
      // from: activePage * querySize,
      // size: querySize,
      track_total_hits: true,
      fields: ['*'],
    },
  };

  return dslQuery;
};
