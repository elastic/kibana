/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SnapshotDetails, RestoreSettings } from '../../../../../common/types';

export interface StepProps {
  snapshotDetails: SnapshotDetails;
  restoreSettings: RestoreSettings;
  updateRestoreSettings: (updatedSettings: Partial<RestoreSettings>) => void;
}

export { RestoreSnapshotStepGeneral } from './step_general';
export { RestoreSnapshotStepSettings } from './step_settings';
export { RestoreSnapshotStepReview } from './step_review';
