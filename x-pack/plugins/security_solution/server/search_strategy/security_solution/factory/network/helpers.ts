/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { assertUnreachable } from '../../../../../common/utility_types';
import {
  Direction,
  NetworkTopTablesSortField,
  FlowTargetSourceDest,
  NetworkTopTablesFields,
} from '../../../../../common/search_strategy/security_solution/network';

export const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest => {
  switch (flowTarget) {
    case FlowTargetSourceDest.source:
      return FlowTargetSourceDest.destination;
    case FlowTargetSourceDest.destination:
      return FlowTargetSourceDest.source;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

export const getQueryOrder = (
  networkTopCountriesSortField: NetworkTopTablesSortField
): QueryOrder => {
  switch (networkTopCountriesSortField.field) {
    case NetworkTopTablesFields.bytes_in:
      return { bytes_in: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.bytes_out:
      return { bytes_out: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.flows:
      return { flows: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.destination_ips:
      return { destination_ips: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.source_ips:
      return { source_ips: networkTopCountriesSortField.direction };
  }
  assertUnreachable(networkTopCountriesSortField.field);
};
