/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { HostFirstLastSeenRequestOptions } from '../../../../../../common/search_strategy/security_solution/hosts';

export const buildFirstLastSeenHostQuery = ({
  hostName,
  defaultIndex,
  docValueFields,
}: HostFirstLastSeenRequestOptions): ISearchRequestParams => {
  const filter = [{ term: { 'host.name': hostName } }];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    track_total_hits: false,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        firstSeen: { min: { field: '@timestamp' } },
        lastSeen: { max: { field: '@timestamp' } },
      },
      query: { bool: { filter } },
      size: 0,
    },
  };

  return dslQuery;
};
