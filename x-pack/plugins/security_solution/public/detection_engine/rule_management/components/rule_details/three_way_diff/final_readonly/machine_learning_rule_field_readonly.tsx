/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DiffableMachineLearningFields } from '../../../../../../../common/api/detection_engine';
import { MachineLearningJobIdReadOnly } from './fields/machine_learning_job_id/machine_learning_job_id';

interface MachineLearningRuleFieldReadOnlyProps {
  fieldName: keyof DiffableMachineLearningFields;
  finalDiffableRule: DiffableMachineLearningFields;
}

export function MachineLearningRuleFieldReadOnly({
  fieldName,
  finalDiffableRule,
}: MachineLearningRuleFieldReadOnlyProps) {
  switch (fieldName) {
    case 'machine_learning_job_id':
      return (
        <MachineLearningJobIdReadOnly
          machineLearningJobId={finalDiffableRule.machine_learning_job_id}
        />
      );
    case 'type':
      return null;
    default:
      return null; // Will replace with `assertUnreachable(fieldName)` once all fields are implemented
  }
}
