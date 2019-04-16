/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowDirection,
  FlowTarget,
  NetworkTopNFlowFields,
  NetworkTopNFlowSortField,
} from '../../graphql/types';

export const helperUpdateTopNFlowDirection = (
  flowTarget: FlowTarget,
  flowDirection: FlowDirection
) => {
  const topNFlowSort: NetworkTopNFlowSortField = {
    field: NetworkTopNFlowFields.bytes,
    direction: Direction.desc,
  };
  if (
    flowDirection === FlowDirection.uniDirectional &&
    [FlowTarget.client, FlowTarget.server].includes(flowTarget)
  ) {
    return { flowDirection, flowTarget: FlowTarget.source, topNFlowSort };
  }
  return { flowDirection, topNFlowSort };
};
