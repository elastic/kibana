/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import {
  NetworkDnsBuckets,
  NetworkDnsEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getDnsEdges = (response: IEsSearchResponse<unknown>): NetworkDnsEdges[] =>
  formatDnsEdges(getOr([], `aggregations.dns_name_query_count.buckets`, response.rawResponse));

export const formatDnsEdges = (buckets: NetworkDnsBuckets[]): NetworkDnsEdges[] =>
  buckets.map((bucket: NetworkDnsBuckets) => ({
    node: {
      _id: bucket.key,
      dnsBytesIn: getOrNumber('dns_bytes_in.value', bucket),
      dnsBytesOut: getOrNumber('dns_bytes_out.value', bucket),
      dnsName: bucket.key,
      queryCount: bucket.doc_count,
      uniqueDomains: getOrNumber('unique_domains.value', bucket),
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));

const getOrNumber = (path: string, bucket: NetworkDnsBuckets) => {
  const numb = get(path, bucket);
  if (numb == null) {
    return null;
  }
  return numb;
};
