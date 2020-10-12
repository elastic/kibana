/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { FieldsConfig, to, from } from './shared';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  separator: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.splitForm.separatorFieldLabel', {
      defaultMessage: 'Separator',
    }),
    deserializer: String,
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.splitForm.separatorFieldHelpText',
      {
        defaultMessage: 'Regex pattern used to delimit the field value.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.splitForm.separatorRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },
  /* Optional fields config */
  preserve_trailing: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.splitForm.preserveTrailingFieldLabel',
      {
        defaultMessage: 'Preserve trailing',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.splitForm.preserveTrailingFieldHelpText',
      { defaultMessage: 'Preserve any trailing whitespace in the split field values.' }
    ),
  },
};

export const Split: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.splitForm.fieldNameHelpText',
          { defaultMessage: 'Field to split.' }
        )}
      />

      <UseField config={fieldsConfig.separator} component={Field} path="fields.separator" />

      <TargetField />

      <UseField
        config={fieldsConfig.preserve_trailing}
        component={ToggleField}
        path="fields.preserve_trailing"
      />

      <IgnoreMissingField />
    </>
  );
};
