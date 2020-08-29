/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getOr } from 'lodash/fp';

import { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  TlsBuckets,
  TlsEdges,
} from '../../../../../../common/search_strategy/security_solution/network';

export const getTlsEdges = (response: IEsSearchResponse<unknown>): TlsEdges[] =>
  formatTlsEdges(getOr([], 'aggregations.sha1.buckets', response.rawResponse));

export const formatTlsEdges = (buckets: TlsBuckets[]): TlsEdges[] =>
  buckets.map((bucket: TlsBuckets) => {
    const edge: TlsEdges = {
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
