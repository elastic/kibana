/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  NetworkTlsBuckets,
  NetworkTlsEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getNetworkTlsEdges = (response: IEsSearchResponse<unknown>): NetworkTlsEdges[] =>
  formatNetworkTlsEdges(getOr([], 'aggregations.sha1.buckets', response.rawResponse));

export const formatNetworkTlsEdges = (buckets: NetworkTlsBuckets[]): NetworkTlsEdges[] =>
  buckets.map((bucket: NetworkTlsBuckets) => {
    const edge: NetworkTlsEdges = {
      node: {
        _id: bucket.key,
        subjects: bucket.subjects.buckets.map(({ key }) => key),
        ja3: bucket.ja3.buckets.map(({ key }) => key),
        issuers: bucket.issuers.buckets.map(({ key }) => key),
        // eslint-disable-next-line @typescript-eslint/naming-convention
        notAfter: bucket.not_after.buckets.map(({ key_as_string }) => key_as_string),
      },
      cursor: {
        value: bucket.key,
        tiebreaker: null,
      },
    };
    return edge;
  });
