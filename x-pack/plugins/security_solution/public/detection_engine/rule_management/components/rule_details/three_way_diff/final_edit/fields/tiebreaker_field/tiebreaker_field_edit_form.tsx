/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  DiffableRule,
  TiebreakerField,
} from '../../../../../../../../../common/api/detection_engine';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { TiebreakerFieldEditAdapter } from './tiebreaker_field_edit_adapter';

export function TiebreakerFieldEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={TiebreakerFieldEditAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

const schema = {
  tiebreaker_field: {},
} as FormSchema<{
  tiebreaker_field: TiebreakerField;
}>;

function deserializer(
  _: FormData,
  finalDiffableRule: DiffableRule
): {
  tiebreakerField: string[];
} {
  if (finalDiffableRule.type !== 'eql') {
    return {
      tiebreakerField: [],
    };
  }

  return {
    tiebreakerField: finalDiffableRule.tiebreaker_field ? [finalDiffableRule.tiebreaker_field] : [],
  };
}

function serializer(formData: FormData): {
  tiebreaker_field?: TiebreakerField;
} {
  const { tiebreakerField } = formData as { tiebreakerField: string[] };

  return {
    tiebreaker_field: tiebreakerField.length ? tiebreakerField[0] : undefined,
  };
}
