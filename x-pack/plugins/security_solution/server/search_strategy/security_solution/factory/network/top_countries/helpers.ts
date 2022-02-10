/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '../../../../../../../../../src/plugins/data/common';
import {
  NetworkTopCountriesBuckets,
  NetworkTopCountriesEdges,
  NetworkTopCountriesRequestOptions,
  FlowTargetSourceDest,
} from '../../../../../../common/search_strategy/security_solution/network';
import { getOppositeField } from '../helpers';

export const getTopCountriesEdges = (
  response: IEsSearchResponse<unknown>,
  options: NetworkTopCountriesRequestOptions
): NetworkTopCountriesEdges[] =>
  formatTopCountriesEdges(
    getOr([], `aggregations.${options.flowTarget}.buckets`, response.rawResponse),
    options.flowTarget
  );

export const formatTopCountriesEdges = (
  buckets: NetworkTopCountriesBuckets[],
  flowTarget: FlowTargetSourceDest
): NetworkTopCountriesEdges[] =>
  buckets.map((bucket: NetworkTopCountriesBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        country: bucket.key,
        flows: getOr(0, 'flows.value', bucket),
        [`${getOppositeField(flowTarget)}_ips`]: getOr(
          0,
          `${getOppositeField(flowTarget)}_ips.value`,
          bucket
        ),
        [`${flowTarget}_ips`]: getOr(0, `${flowTarget}_ips.value`, bucket),
      },
      network: {
        bytes_in: getOr(0, 'bytes_in.value', bucket),
        bytes_out: getOr(0, 'bytes_out.value', bucket),
      },
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));
