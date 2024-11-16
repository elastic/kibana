/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { type MachineLearningJobId } from '../../../../../../../../../common/api/detection_engine';
import { normalizeMachineLearningJobId } from '../../../../../../../../common/utils/normalize_machine_learning_job_id';
import { MachineLearningJobIdAdapter } from './machine_learning_job_id_adapter';

interface MachineLearningJobIdFormData {
  machineLearningJobId: MachineLearningJobId;
}

export function MachineLearningJobIdForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={MachineLearningJobIdAdapter}
      ruleFieldFormSchema={machineLearningJobIdSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

function deserializer(defaultValue: FormData): MachineLearningJobIdFormData {
  return {
    machineLearningJobId: normalizeMachineLearningJobId(defaultValue.machine_learning_job_id),
  };
}

function serializer(formData: FormData): {
  machine_learning_job_id: MachineLearningJobId;
} {
  return {
    machine_learning_job_id: formData.machineLearningJobId,
  };
}

const machineLearningJobIdSchema = {
  machineLearningJobId: schema.machineLearningJobId,
} as FormSchema<MachineLearningJobIdFormData>;
