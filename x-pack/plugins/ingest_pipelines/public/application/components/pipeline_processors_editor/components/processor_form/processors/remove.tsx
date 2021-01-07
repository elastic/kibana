/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  UseField,
  ComboBoxField,
  fieldValidators,
} from '../../../../../../shared_imports';

import { FieldsConfig, to } from './shared';

import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  field: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    serializer: (v: string[]) => (v.length === 1 ? v[0] : v),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.removeForm.fieldNameField', {
      defaultMessage: 'Fields',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.removeForm.fieldNameHelpText', {
      defaultMessage: 'Fields to remove.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.removeForm.fieldNameRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },
};

export const Remove: FunctionComponent = () => {
  return (
    <>
      <UseField config={fieldsConfig.field} component={ComboBoxField} path="fields.field" />

      <IgnoreMissingField />
    </>
  );
};
