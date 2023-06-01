/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-common';
import { EVENT_KIND_ASSET_FILTER } from '../../../../../../common/search_strategy';
import type { ManagedUserDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution/users/managed_details';

export const buildManagedUserDetailsQuery = ({
  userName,
  defaultIndex,
}: ManagedUserDetailsRequestOptions): ISearchRequestParams => {
  const filter = [{ term: { 'user.name': userName } }, EVENT_KIND_ASSET_FILTER];

  const dslQuery = {
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    track_total_hits: false,
    body: {
      query: { bool: { filter } },
      size: 1,
    },
    sort: [{ '@timestamp': 'desc' }],
  };

  return dslQuery;
};
