/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { isThresholdRule } from '../../../../../common/detection_engine/utils';
import type { FormHook } from '../../../../shared_imports';
import { useFormData } from '../../../../shared_imports';
import { THRESHOLD_ALERT_SUPPRESSION_ENABLED } from '../../../rule_creation/components/threshold_alert_suppression_edit/fields';
import {
  ALERT_SUPPRESSION_DURATION,
  ALERT_SUPPRESSION_DURATION_TYPE,
  ALERT_SUPPRESSION_DURATION_UNIT,
  ALERT_SUPPRESSION_DURATION_VALUE,
  ALERT_SUPPRESSION_FIELDS,
  ALERT_SUPPRESSION_MISSING_FIELDS,
} from '../../../rule_creation/components/alert_suppression_edit/fields';
import {
  AlertSuppressionDurationType,
  type DefineStepRule,
} from '../../../../detections/pages/detection_engine/rules/types';

interface UsePersistentAlertSuppressionStateParams {
  form: FormHook<DefineStepRule>;
}

export function usePersistentAlertSuppressionState({
  form,
}: UsePersistentAlertSuppressionStateParams): void {
  const [
    {
      ruleType,
      [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: thresholdAlertSuppressionEnabled,
      [ALERT_SUPPRESSION_FIELDS]: suppressionFields,
      [ALERT_SUPPRESSION_DURATION_TYPE]: suppressionDurationType,
      [ALERT_SUPPRESSION_DURATION]: suppressionDuration,
      [ALERT_SUPPRESSION_MISSING_FIELDS]: suppressionMissingFieldsStrategy,
    },
  ] = useFormData({
    form,
    watch: [
      'ruleType',
      THRESHOLD_ALERT_SUPPRESSION_ENABLED,
      ALERT_SUPPRESSION_FIELDS,
      ALERT_SUPPRESSION_DURATION_TYPE,
      `${ALERT_SUPPRESSION_DURATION}.${ALERT_SUPPRESSION_DURATION_VALUE}`,
      `${ALERT_SUPPRESSION_DURATION}.${ALERT_SUPPRESSION_DURATION_UNIT}`,
      ALERT_SUPPRESSION_MISSING_FIELDS,
    ],
  });

  useEffect(() => {
    form.updateFieldValues({
      [THRESHOLD_ALERT_SUPPRESSION_ENABLED]: thresholdAlertSuppressionEnabled,
      [ALERT_SUPPRESSION_FIELDS]: suppressionFields,
      ...(isThresholdRule(ruleType)
        ? { [ALERT_SUPPRESSION_DURATION_TYPE]: AlertSuppressionDurationType.PerTimePeriod }
        : { [ALERT_SUPPRESSION_DURATION_TYPE]: suppressionDurationType }),
      [ALERT_SUPPRESSION_DURATION]: suppressionDuration,
      [ALERT_SUPPRESSION_MISSING_FIELDS]: suppressionMissingFieldsStrategy,
    });
  }, [
    form,
    ruleType,
    thresholdAlertSuppressionEnabled,
    suppressionFields,
    suppressionDurationType,
    suppressionDuration,
    suppressionMissingFieldsStrategy,
  ]);
}
