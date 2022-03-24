/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';
import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  NetworkUsersBucketsItem,
  NetworkUsersEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getUsersEdges = (response: IEsSearchResponse<unknown>): NetworkUsersEdges[] =>
  getOr([], `aggregations.users.buckets`, response.rawResponse).map(
    (bucket: NetworkUsersBucketsItem) => ({
      node: {
        _id: bucket.key,
        user: {
          id: getOr([], 'id.buckets', bucket).map((id: NetworkUsersBucketsItem) => id.key),
          name: bucket.key,
          groupId: getOr([], 'groupId.buckets', bucket).map(
            (groupId: NetworkUsersBucketsItem) => groupId.key
          ),
          groupName: getOr([], 'groupName.buckets', bucket).map(
            (groupName: NetworkUsersBucketsItem) => groupName.key
          ),
          count: get('doc_count', bucket),
        },
      },
      cursor: {
        value: bucket.key,
        tiebreaker: null,
      },
    })
  );
