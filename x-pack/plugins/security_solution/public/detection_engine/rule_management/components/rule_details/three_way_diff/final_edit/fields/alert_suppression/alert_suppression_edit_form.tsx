/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GroupByOptions } from '../../../../../../../../detections/pages/detection_engine/rules/types';
import { type FormData } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { AlertSuppressionEditAdapter } from './alert_suppression_edit_adapter';
import type { AlertSuppressionFormData } from './form_schema';
import { alertSuppressionFormSchema } from './form_schema';
import { DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY } from '../../../../../../../../../common/detection_engine/constants';
import type { AlertSuppression } from '../../../../../../../../../common/api/detection_engine';

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
    groupByFields: alertSuppression?.group_by ?? [],
    groupByRadioSelection: alertSuppression?.duration
      ? GroupByOptions.PerTimePeriod
      : GroupByOptions.PerRuleExecution,
    groupByDuration: alertSuppression?.duration ?? {
      value: 5,
      unit: 'm',
    },
    suppressionMissingFields:
      alertSuppression?.missing_fields_strategy ?? DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
  };
}

function serializer(formData: FormData): FormData {
  const alertSuppressionFormData = formData as AlertSuppressionFormData;

  return {
    alert_suppression: {
      group_by: alertSuppressionFormData.groupByFields,
      duration:
        alertSuppressionFormData.groupByRadioSelection === GroupByOptions.PerTimePeriod
          ? alertSuppressionFormData.groupByDuration
          : undefined,
      missing_fields_strategy:
        alertSuppressionFormData.suppressionMissingFields ||
        DEFAULT_SUPPRESSION_MISSING_FIELDS_STRATEGY,
    },
  };
}
