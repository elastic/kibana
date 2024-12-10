/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { indexPatternValidatorFactory } from '../../../../../../../rule_creation_ui/validators/index_pattern_validator_factory';
import { dataViewIdValidatorFactory } from '../../../../../../../rule_creation_ui/validators/data_view_id_validator_factory';
import type { ValidationFunc, ERROR_CODE } from '../../../../../../../../shared_imports';
import {
  type FormData,
  type FormSchema,
  FIELD_TYPES,
} from '../../../../../../../../shared_imports';
import { DataSourceType } from '../../../../../../../../../common/api/detection_engine/prebuilt_rules';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { DataSourceEdit } from './data_source_edit';
import { INDEX_HELPER_TEXT } from '../../../../../../../rule_creation_ui/components/step_define_rule/translations';
import * as i18n from './translations';

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
  index_patterns: {
    defaultValue: [],
    type: FIELD_TYPES.COMBO_BOX,
    label: i18n.INDEX_PATTERNS,
    helpText: <EuiText size="xs">{INDEX_HELPER_TEXT}</EuiText>,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          const [{ formData }] = args;

          if (formData.type !== DataSourceType.index_patterns) {
            return;
          }

          return indexPatternValidatorFactory()(...args);
        },
      },
    ],
  },
  data_view_id: {
    label: i18n.DATA_VIEW,
    validations: [
      {
        validator: (...args: Parameters<ValidationFunc>) => {
          const [{ formData }] = args;

          if (formData.type !== DataSourceType.data_view) {
            return;
          }

          return dataViewIdValidatorFactory()(...args);
        },
      },
    ],
  },
} as FormSchema<{
  type: string;
  index_patterns: string[];
  data_view_id: string;
}>;
