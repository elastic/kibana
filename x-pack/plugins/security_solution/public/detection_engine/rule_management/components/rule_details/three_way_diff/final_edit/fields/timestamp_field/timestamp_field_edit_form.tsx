/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  DiffableRule,
  TimestampField,
} from '../../../../../../../../../common/api/detection_engine';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { TimestampFieldEditAdapter } from './timestamp_field_edit_adapter';

export function TimestampFieldEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={TimestampFieldEditAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

const schema = {
  timestamp_field: {},
} as FormSchema<{
  timestamp_field: TimestampField;
}>;

function deserializer(
  _: FormData,
  finalDiffableRule: DiffableRule
): {
  timestampField: string[];
} {
  if (finalDiffableRule.type !== 'eql') {
    return {
      timestampField: [],
    };
  }

  return {
    timestampField: finalDiffableRule.timestamp_field ? [finalDiffableRule.timestamp_field] : [],
  };
}

function serializer(formData: FormData): {
  timestamp_field?: TimestampField;
} {
  const { timestampField } = formData as { timestampField: string[] };

  return {
    timestamp_field: timestampField.length ? timestampField[0] : undefined,
  };
}
