/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr, isArray } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type {
  NetworkHttpBuckets,
  NetworkHttpEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getHttpEdges = (response: IEsSearchResponse<unknown>): NetworkHttpEdges[] =>
  formatHttpEdges(getOr([], `aggregations.url.buckets`, response.rawResponse));

const formatHttpEdges = (buckets: NetworkHttpBuckets[]): NetworkHttpEdges[] =>
  buckets.map((bucket: NetworkHttpBuckets) => {
    const bucketKey = isArray(bucket.key) ? bucket.key[0] : bucket.key;
    return {
      node: {
        _id: bucketKey,
        domains: bucket.domains.buckets.map(({ key }) => (isArray(key) ? key[0] : key)),
        methods: bucket.methods.buckets.map(({ key }) => (isArray(key) ? key[0] : key)),
        statuses: bucket.status.buckets.map(({ key }) => `${isArray(key) ? key[0] : key}`),
        lastHost: get('source.hits.hits[0].fields["host.name"]', bucket),
        lastSourceIp: get('source.hits.hits[0].fields["source.ip"]', bucket),
        path: bucketKey,
        requestCount: bucket.doc_count,
      },
      cursor: {
        value: bucketKey,
        tiebreaker: null,
      },
    };
  });
