/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SnapshotDetails, RestoreSettings } from '../../../../../common/types';
import { RestoreValidation } from '../../../services/validation';

export interface StepProps {
  snapshotDetails: SnapshotDetails;
  restoreSettings: RestoreSettings;
  updateRestoreSettings: (updatedSettings: Partial<RestoreSettings>) => void;
  errors: RestoreValidation['errors'];
  updateCurrentStep: (step: number) => void;
}

export { RestoreSnapshotStepLogistics } from './step_logistics/step_logistics';
export { RestoreSnapshotStepSettings } from './step_settings';
export { RestoreSnapshotStepReview } from './step_review';
