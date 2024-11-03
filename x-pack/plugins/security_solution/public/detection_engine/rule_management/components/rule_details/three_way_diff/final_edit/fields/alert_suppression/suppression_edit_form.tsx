/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  SUPPRESSION_DURATION,
  SUPPRESSION_DURATION_SELECTOR,
  SUPPRESSION_FIELDS,
  SUPPRESSION_MISSING_FIELDS,
} from '../../../../../../../rule_creation/components/alert_suppression_edit/fields';
import { GroupByOptions } from '../../../../../../../../detections/pages/detection_engine/rules/types';
import { type FormData } from '../../../../../../../../shared_imports';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import {
  AlertSuppressionDurationUnitEnum,
  type AlertSuppression,
} from '../../../../../../../../../common/api/detection_engine';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { AlertSuppressionEditAdapter } from './suppression_edit_adapter';
import { alertSuppressionFormSchema, type AlertSuppressionFormData } from './form_schema';

export function AlertSuppressionEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={AlertSuppressionEditAdapter}
      ruleFieldFormSchema={alertSuppressionFormSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

function deserializer(defaultValue: FormData): AlertSuppressionFormData {
  const alertSuppression = defaultValue.alert_suppression as AlertSuppression | undefined;

  return {
    [SUPPRESSION_FIELDS]: alertSuppression?.group_by ?? [],
    [SUPPRESSION_DURATION_SELECTOR]: alertSuppression?.duration
      ? GroupByOptions.PerTimePeriod
      : GroupByOptions.PerRuleExecution,
    [SUPPRESSION_DURATION]: alertSuppression?.duration ?? {
      value: 5,
      unit: AlertSuppressionDurationUnitEnum.m,
    },
    [SUPPRESSION_MISSING_FIELDS]:
      alertSuppression?.missing_fields_strategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  };
}

function serializer(formData: FormData): { alert_suppression?: AlertSuppression } {
  const alertSuppressionFormData = formData as AlertSuppressionFormData;

  if (alertSuppressionFormData[SUPPRESSION_FIELDS].length === 0) {
    return {};
  }

  return {
    alert_suppression: {
      group_by: alertSuppressionFormData[SUPPRESSION_FIELDS],
      duration:
        alertSuppressionFormData[SUPPRESSION_DURATION_SELECTOR] === GroupByOptions.PerTimePeriod
          ? alertSuppressionFormData[SUPPRESSION_DURATION]
          : undefined,
      missing_fields_strategy:
        alertSuppressionFormData[SUPPRESSION_MISSING_FIELDS] ||
        DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
    },
  };
}
