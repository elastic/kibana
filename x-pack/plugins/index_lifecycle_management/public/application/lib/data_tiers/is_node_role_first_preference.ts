/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataTierRole, PhaseWithAllocation } from '../../../../common/types';
import { phaseToNodePreferenceMap } from '../../../../common/constants';

export const isNodeRoleFirstPreference = (phase: PhaseWithAllocation, nodeRole: DataTierRole) => {
  return phaseToNodePreferenceMap[phase][0] === nodeRole;
};
