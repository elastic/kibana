/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  NetworkHttpBuckets,
  NetworkHttpEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getHttpEdges = (response: IEsSearchResponse<unknown>): NetworkHttpEdges[] =>
  formatHttpEdges(getOr([], `aggregations.url.buckets`, response.rawResponse));

const formatHttpEdges = (buckets: NetworkHttpBuckets[]): NetworkHttpEdges[] =>
  buckets.map((bucket: NetworkHttpBuckets) => ({
    node: {
      _id: bucket.key,
      domains: bucket.domains.buckets.map(({ key }) => key),
      methods: bucket.methods.buckets.map(({ key }) => key),
      statuses: bucket.status.buckets.map(({ key }) => `${key}`),
      lastHost: get('source.hits.hits[0]._source.host.name', bucket),
      lastSourceIp: get('source.hits.hits[0]._source.source.ip', bucket),
      path: bucket.key,
      requestCount: bucket.doc_count,
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));
