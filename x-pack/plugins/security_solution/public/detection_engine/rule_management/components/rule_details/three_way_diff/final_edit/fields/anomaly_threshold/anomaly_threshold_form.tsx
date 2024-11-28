/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormSchema } from '../../../../../../../../shared_imports';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { AnomalyThresholdAdapter } from './anomaly_threshold_adapter';
import type { AnomalyThreshold } from '../../../../../../../../../common/api/detection_engine';

interface AnomalyThresholdFormData {
  anomalyThreshold: AnomalyThreshold;
}

export function AnomalyThresholdForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={AnomalyThresholdAdapter}
      ruleFieldFormSchema={anomalyThresholdSchema}
    />
  );
}

const anomalyThresholdSchema = {
  anomalyThreshold: schema.anomalyThreshold,
} as FormSchema<AnomalyThresholdFormData>;
