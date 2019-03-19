/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  NetworkTopNFlowDirection,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
  NetworkTopNFlowType,
} from '../../../graphql/types';

export const helperUpdateTopNFlowDirection = (
  topNFlowType: NetworkTopNFlowType,
  topNFlowDirection: NetworkTopNFlowDirection
) => {
  const topNFlowSort: NetworkTopNFlowSortField = {
    field: NetworkTopNFlowFields.bytes,
    direction: Direction.desc,
  };
  if (
    topNFlowDirection === NetworkTopNFlowDirection.uniDirectional &&
    [NetworkTopNFlowType.client, NetworkTopNFlowType.server].includes(topNFlowType)
  ) {
    return { topNFlowDirection, topNFlowType: NetworkTopNFlowType.source, topNFlowSort };
  }
  return { topNFlowDirection, topNFlowSort };
};
