/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NodeRole, ListNodesRouteResponse } from '../../../../common/types';

/**
 * Given a phase and current node roles, determine whether the phase
 * can use default data tier allocation.
 *
 * This can only be checked for phases that have an allocate action.
 */
export const isPhaseDefaultDataAllocationCompatible = (
  phase: 'warm' | 'cold' | 'frozen',
  nodesByRoles: ListNodesRouteResponse['nodesByRoles']
): boolean => {
  // The 'data' role covers all node roles, so if we have at least one node with the data role
  // we can use default allocation.
  if (nodesByRoles.data?.length) {
    return true;
  }

  // Otherwise we need to check whether a node role for the specific phase exists
  if (nodesByRoles[`data_${phase}` as NodeRole]?.length) {
    return true;
  }

  // Otherwise default allocation has nowhere to allocate new shards to in this phase.
  return false;
};
