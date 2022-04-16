/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';

import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import { assertUnreachable } from '../../../../../../common/utility_types';
import {
  Direction,
  GeoItem,
  SortField,
  NetworkTopNFlowBuckets,
  NetworkTopNFlowEdges,
  NetworkTopNFlowRequestOptions,
  NetworkTopTablesFields,
  FlowTargetSourceDest,
  AutonomousSystemItem,
} from '../../../../../../common/search_strategy';
import { getOppositeField } from '../helpers';
import { formatResponseObjectValues } from '../../../../helpers/format_response_object_values';

export const getTopNFlowEdges = (
  response: IEsSearchResponse<unknown>,
  options: NetworkTopNFlowRequestOptions
): NetworkTopNFlowEdges[] =>
  formatTopNFlowEdges(
    getOr([], `aggregations.${options.flowTarget}.buckets`, response.rawResponse),
    options.flowTarget
  );

const formatTopNFlowEdges = (
  buckets: NetworkTopNFlowBuckets[],
  flowTarget: FlowTargetSourceDest
): NetworkTopNFlowEdges[] =>
  buckets.map((bucket: NetworkTopNFlowBuckets) => ({
    node: {
      _id: bucket.key,
      [flowTarget]: {
        domain: bucket.domain.buckets.map((bucketDomain) => bucketDomain.key),
        ip: bucket.key,
        location: getGeoItem(bucket),
        autonomous_system: getAsItem(bucket),
        flows: getOr(0, 'flows.value', bucket),
        [`${getOppositeField(flowTarget)}_ips`]: getOr(
          0,
          `${getOppositeField(flowTarget)}_ips.value`,
          bucket
        ),
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

const getFlowTargetFromString = (flowAsString: string) =>
  flowAsString === 'source' ? FlowTargetSourceDest.source : FlowTargetSourceDest.destination;

const getGeoItem = (result: NetworkTopNFlowBuckets): GeoItem | null =>
  result.location.top_geo.hits.hits.length > 0 && result.location.top_geo.hits.hits[0]._source
    ? {
        geo: formatResponseObjectValues(
          getOr(
            '',
            `location.top_geo.hits.hits[0]._source.${
              Object.keys(result.location.top_geo.hits.hits[0]._source)[0]
            }.geo`,
            result
          )
        ),
        flowTarget: getFlowTargetFromString(
          Object.keys(result.location.top_geo.hits.hits[0]._source)[0]
        ),
      }
    : null;

const getAsItem = (result: NetworkTopNFlowBuckets): AutonomousSystemItem | null =>
  result.autonomous_system.top_as.hits.hits.length > 0 &&
  result.autonomous_system.top_as.hits.hits[0]._source
    ? {
        number: getOr(
          null,
          `autonomous_system.top_as.hits.hits[0]._source.${
            Object.keys(result.autonomous_system.top_as.hits.hits[0]._source)[0]
          }.as.number`,
          result
        ),
        name: getOr(
          '',
          `autonomous_system.top_as.hits.hits[0]._source.${
            Object.keys(result.autonomous_system.top_as.hits.hits[0]._source)[0]
          }.as.organization.name`,
          result
        ),
      }
    : null;

type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

export const getQueryOrder = (
  networkTopNFlowSortField: SortField<NetworkTopTablesFields>
): QueryOrder => {
  switch (networkTopNFlowSortField.field) {
    case NetworkTopTablesFields.bytes_in:
      return { bytes_in: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.bytes_out:
      return { bytes_out: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.flows:
      return { flows: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.destination_ips:
      return { destination_ips: networkTopNFlowSortField.direction };
    case NetworkTopTablesFields.source_ips:
      return { source_ips: networkTopNFlowSortField.direction };
  }
  assertUnreachable(networkTopNFlowSortField.field);
};
