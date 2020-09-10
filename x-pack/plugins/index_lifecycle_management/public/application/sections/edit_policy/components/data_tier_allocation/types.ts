/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ListNodesRouteResponse,
  PhaseWithAllocation,
  PhaseWithAllocationAction,
} from '../../../../../../common/types';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';

export interface SharedProps<T extends PhaseWithAllocationAction> {
  phase: PhaseWithAllocation;
  errors?: PhaseValidationErrors<T>;
  phaseData: T;
  setPhaseData: (dataKey: keyof T, value: string) => void;
  isShowingErrors: boolean;
  nodes: ListNodesRouteResponse['nodesByAttributes'];
  hasNodeAttributes: boolean;
}
