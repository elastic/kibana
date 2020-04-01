/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SlmPolicyPayload } from '../../../../../common/types';
import { PolicyValidation } from '../../../services/validation';

export interface StepProps {
  policy: SlmPolicyPayload;
  indices: string[];
  updatePolicy: (updatedSettings: Partial<SlmPolicyPayload>, validationHelperData?: any) => void;
  isEditing: boolean;
  currentUrl: string;
  errors: PolicyValidation['errors'];
  updateCurrentStep: (step: number) => void;
}

export { PolicyStepLogistics } from './step_logistics';
export { PolicyStepSettings } from './step_settings';
export { PolicyStepRetention } from './step_retention';
export { PolicyStepReview } from './step_review';
