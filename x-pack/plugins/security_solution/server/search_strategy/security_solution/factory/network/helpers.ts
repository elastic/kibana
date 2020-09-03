/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { assertUnreachable } from '../../../../../common/utility_types';
import { FlowTargetSourceDest } from '../../../../../common/search_strategy/security_solution/network';

export const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest => {
  switch (flowTarget) {
    case FlowTargetSourceDest.source:
      return FlowTargetSourceDest.destination;
    case FlowTargetSourceDest.destination:
      return FlowTargetSourceDest.source;
  }
  assertUnreachable(flowTarget);
};
