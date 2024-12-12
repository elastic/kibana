/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormData } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { ThresholdAdapter } from './threshold_adapter';
import type { FieldValueThreshold } from '../../../../../../../rule_creation_ui/components/threshold_input';
import type { Threshold } from '../../../../../../../../../common/api/detection_engine';
import { normalizeThresholdField } from '../../../../../../../../../common/detection_engine/utils';

export function ThresholdEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={ThresholdAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

interface ThresholdFormData {
  threshold: FieldValueThreshold;
}

function deserializer(defaultValue: FormData): ThresholdFormData {
  const threshold: Threshold = defaultValue.threshold;

  const deserializedThreshold: FieldValueThreshold = {
    field: normalizeThresholdField(threshold.field),
    value: `${threshold?.value ?? 100}`,
  };

  if (threshold.cardinality?.length) {
    deserializedThreshold.cardinality = {
      field: [`${threshold.cardinality[0].field}`],
      value: `${threshold.cardinality[0].value}`,
    };
  }

  return { threshold: deserializedThreshold };
}

function serializer(formData: FormData): { threshold: Threshold } {
  const threshold: FieldValueThreshold = formData.threshold;

  const serializedThreshold: Threshold = {
    field: threshold.field,
    value: Number.parseInt(threshold.value, 10),
  };

  if (threshold.cardinality?.field?.length) {
    serializedThreshold.cardinality = [
      {
        field: threshold.cardinality.field[0],
        value: Number.parseInt(threshold.cardinality.value, 10),
      },
    ];
  }

  return { threshold: serializedThreshold };
}

const schema = {};
