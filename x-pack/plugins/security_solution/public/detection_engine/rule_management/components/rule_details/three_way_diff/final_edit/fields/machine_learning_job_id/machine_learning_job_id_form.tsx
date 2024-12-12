/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormData } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { type MachineLearningJobId } from '../../../../../../../../../common/api/detection_engine';
import { normalizeMachineLearningJobId } from '../../../../../../../../common/utils/normalize_machine_learning_job_id';
import { MachineLearningJobIdAdapter } from './machine_learning_job_id_adapter';

interface MachineLearningJobIdFormData {
  machine_learning_job_id: MachineLearningJobId;
}

export function MachineLearningJobIdForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={MachineLearningJobIdAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
    />
  );
}

function deserializer(defaultValue: FormData): MachineLearningJobIdFormData {
  return {
    machine_learning_job_id: normalizeMachineLearningJobId(defaultValue.machine_learning_job_id),
  };
}

const schema = {};
