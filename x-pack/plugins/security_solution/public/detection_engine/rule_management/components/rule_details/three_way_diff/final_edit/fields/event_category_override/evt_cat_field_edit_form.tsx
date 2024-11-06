/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  DiffableRule,
  EventCategoryOverride,
} from '../../../../../../../../../common/api/detection_engine';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { EventCategoryOverrideEditAdapter } from './evt_cat_field_edit_adapter';

export function EventCategoryOverrideEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={EventCategoryOverrideEditAdapter}
      ruleFieldFormSchema={schema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

const schema = {
  event_category_override: {},
} as FormSchema<{
  event_category_override: EventCategoryOverride;
}>;

function deserializer(
  _: FormData,
  finalDiffableRule: DiffableRule
): {
  eventCategoryOverride: string[];
} {
  if (finalDiffableRule.type !== 'eql') {
    return {
      eventCategoryOverride: [],
    };
  }

  return {
    eventCategoryOverride: finalDiffableRule.event_category_override
      ? [finalDiffableRule.event_category_override]
      : [],
  };
}

function serializer(formData: FormData): {
  event_category_override?: EventCategoryOverride;
} {
  const { eventCategoryOverride } = formData as { eventCategoryOverride: string[] };

  return {
    event_category_override: eventCategoryOverride.length ? eventCategoryOverride[0] : undefined,
  };
}
