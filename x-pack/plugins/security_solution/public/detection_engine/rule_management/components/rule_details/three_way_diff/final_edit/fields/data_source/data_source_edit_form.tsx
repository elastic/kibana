/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FormData, FormSchema } from '../../../../../../../../shared_imports';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { DataSourceEdit } from './data_source_edit';

export function DataSourceEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={DataSourceEdit}
      ruleFieldFormSchema={dataSourceSchema}
      deserializer={dataSourceDeserializer}
      serializer={dataSourceSerializer}
    />
  );
}

function dataSourceDeserializer(defaultValue: FormData): FormData {
  if (!defaultValue.data_source) {
    throw new Error(`dataSourceDeserializer expects "data_source" field`);
  }

  return defaultValue.data_source;
}

function dataSourceSerializer(formData: FormData): FormData {
  return {
    data_source: formData,
  };
}

const dataSourceSchema = {
  type: {
    default: DataSourceType.index_patterns,
  },
  index_patterns: schema.index,
  data_view_id: schema.dataViewId,
} as FormSchema<{
  type: string;
  index_patterns: string[];
  data_view_id: string;
}>;
