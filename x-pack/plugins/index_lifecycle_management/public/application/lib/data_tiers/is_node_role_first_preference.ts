/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { phaseToNodePreferenceMap } from '../../../../common/constants';
import { DataTierRole, PhaseWithAllocation } from '../../../../common/types';

export const isNodeRoleFirstPreference = (phase: PhaseWithAllocation, nodeRole: DataTierRole) => {
  return phaseToNodePreferenceMap[phase][0] === nodeRole;
};
