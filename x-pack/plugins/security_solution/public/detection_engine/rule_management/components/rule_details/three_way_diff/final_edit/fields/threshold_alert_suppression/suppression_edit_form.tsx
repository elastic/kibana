/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  THRESHOLD_ALERT_SUPPRESSION_ENABLED,
  ThresholdAlertSuppressionEdit,
} from '../../../../../../../rule_creation/components/threshold_alert_suppression_edit';
import { ALERT_SUPPRESSION_DURATION_FIELD_NAME } from '../../../../../../../rule_creation/components/alert_suppression_edit';
import { type FormData } from '../../../../../../../../shared_imports';
import type { ThresholdAlertSuppression } from '../../../../../../../../../common/api/detection_engine';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import {
  thresholdAlertSuppressionFormSchema,
  type ThresholdAlertSuppressionFormData,
} from './form_schema';
import type { RuleFieldEditComponentProps } from '../rule_field_edit_component_props';

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

  return <ThresholdAlertSuppressionEdit suppressionFieldNames={suppressibleFields} />;
}

function deserializer(defaultValue: FormData): ThresholdAlertSuppressionFormData {
  const alertSuppression = defaultValue.alert_suppression as ThresholdAlertSuppression | undefined;

  return {
    [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: Boolean(alertSuppression?.duration),
    [ALERT_SUPPRESSION_DURATION_FIELD_NAME]: alertSuppression?.duration ?? {
      value: 5,
      unit: 'm',
    },
  };
}

function serializer(formData: FormData): { alert_suppression?: ThresholdAlertSuppression } {
  const alertSuppressionFormData = formData as ThresholdAlertSuppressionFormData;

  if (!alertSuppressionFormData[THRESHOLD_ALERT_SUPPRESSION_ENABLED]) {
    return {};
  }

  return {
    alert_suppression: {
      duration: alertSuppressionFormData[ALERT_SUPPRESSION_DURATION_FIELD_NAME],
    },
  };
}
