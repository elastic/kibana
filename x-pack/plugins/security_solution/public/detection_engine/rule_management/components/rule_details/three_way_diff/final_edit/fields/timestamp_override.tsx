/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { FormSchema, FormData } from '../../../../../../../shared_imports';
import { Field, UseField, useFormData } from '../../../../../../../shared_imports';
import { schema } from '../../../../../../rule_creation_ui/components/step_about_rule/schema';
import { EsFieldSelectorField } from '../../../../../../rule_creation_ui/components/es_field_selector_field';
import { useDefaultIndexPattern } from '../../../../../hooks/use_default_index_pattern';
import { getUseRuleIndexPatternParameters } from '../utils';
import { useRuleIndexPattern } from '../../../../../../rule_creation_ui/pages/form';
import type {
  DiffableRule,
  TimestampOverrideObject,
} from '../../../../../../../../common/api/detection_engine';

export const timestampOverrideSchema = {
  timestampOverride: schema.timestampOverride,
  timestampOverrideFallbackDisabled: schema.timestampOverrideFallbackDisabled,
} as FormSchema<{
  timestampOverride: string;
  timestampOverrideFallbackDisabled: boolean | undefined;
}>;

interface TimestampOverrideEditProps {
  finalDiffableRule: DiffableRule;
}

export function TimestampOverrideEdit({
  finalDiffableRule,
}: TimestampOverrideEditProps): JSX.Element {
  const defaultIndexPattern = useDefaultIndexPattern();
  const indexPatternParameters = getUseRuleIndexPatternParameters(
    finalDiffableRule,
    defaultIndexPattern
  );
  const { indexPattern, isIndexPatternLoading } = useRuleIndexPattern(indexPatternParameters);

  const componentProps = useMemo(
    () => ({
      fieldType: 'date',
      indices: indexPattern,
      isDisabled: isIndexPatternLoading,
    }),
    [indexPattern, isIndexPatternLoading]
  );

  return (
    <>
      <UseField
        path="timestampOverride"
        component={EsFieldSelectorField}
        componentProps={componentProps}
      />
      <TimestampFallbackDisabled />
    </>
  );
}

function TimestampFallbackDisabled() {
  const [formData] = useFormData();
  const { timestampOverride } = formData;

  if (timestampOverride && timestampOverride !== '@timestamp') {
    return <UseField path="timestampOverrideFallbackDisabled" component={Field} />;
  }

  return null;
}

export function timestampOverrideDeserializer(defaultValue: FormData) {
  return {
    timestampOverride: defaultValue.timestamp_override.field_name,
    timestampOverrideFallbackDisabled: defaultValue.timestamp_override.fallback_disabled ?? false,
  };
}

export function timestampOverrideSerializer(formData: FormData): {
  timestamp_override: TimestampOverrideObject | undefined;
} {
  if (formData.timestampOverride === '') {
    return { timestamp_override: undefined };
  }

  return {
    timestamp_override: {
      field_name: formData.timestampOverride,
      fallback_disabled: formData.timestampOverrideFallbackDisabled,
    },
  };
}
