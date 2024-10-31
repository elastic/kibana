/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type FormData } from '../../../../../../../../shared_imports';
import type { ThresholdAlertSuppression } from '../../../../../../../../../common/api/detection_engine';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import type { ThresholdAlertSuppressionFormData } from './form_schema';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';
import {
  thresholdAlertSuppressionFormSchema,
  SUPPRESSION_DURATION,
  THRESHOLD_SUPPRESSION_ENABLED,
} from './form_schema';
import { ThresholdAlertSuppressionEdit } from './threshold_alert_suppression_edit';

export function ThresholdAlertSuppressionEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={ThresholdAlertSuppressionEditAdapter}
      ruleFieldFormSchema={thresholdAlertSuppressionFormSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

function ThresholdAlertSuppressionEditAdapter({
  finalDiffableRule,
}: RuleFieldEditComponentProps): JSX.Element {
  if (finalDiffableRule.type !== 'threshold') {
    throw new Error('Threshold rule type expected');
  }

  const suppressibleFields = [finalDiffableRule.threshold.field].flat();

  return <ThresholdAlertSuppressionEdit suppressibleFields={suppressibleFields} />;
}

function deserializer(defaultValue: FormData): ThresholdAlertSuppressionFormData {
  const alertSuppression = defaultValue.alert_suppression as ThresholdAlertSuppression | undefined;

  return {
    [THRESHOLD_SUPPRESSION_ENABLED]: Boolean(alertSuppression?.duration),
    [SUPPRESSION_DURATION]: alertSuppression?.duration ?? {
      value: 5,
      unit: 'm',
    },
  };
}

function serializer(formData: FormData): { alert_suppression: ThresholdAlertSuppression } {
  const alertSuppressionFormData = formData as ThresholdAlertSuppressionFormData;

  return {
    alert_suppression: {
      duration: alertSuppressionFormData[SUPPRESSION_DURATION],
    },
  };
}
