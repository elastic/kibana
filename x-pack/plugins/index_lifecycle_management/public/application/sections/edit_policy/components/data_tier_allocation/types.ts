/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Phase, Phases } from '../../../../services/policies/types';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';

export interface SharedProps<T extends Phase> {
  phase: keyof Phases & string;
  errors?: PhaseValidationErrors<T>;
  phaseData: T;
  setPhaseData: (dataKey: keyof T & string, value: string | undefined) => void;
  isShowingErrors: boolean;
}
