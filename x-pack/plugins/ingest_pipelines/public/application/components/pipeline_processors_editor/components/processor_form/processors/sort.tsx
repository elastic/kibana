/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, UseField, SelectField } from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';
import { FieldsConfig, from } from './shared';

const fieldsConfig: FieldsConfig = {
  /* Optional fields config */
  order: {
    type: FIELD_TYPES.SELECT,
    defaultValue: 'asc',
    deserializer: (v) => (v === 'asc' || v === 'desc' ? v : 'asc'),
    serializer: from.undefinedIfValue('asc'),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.sortForm.orderFieldLabel', {
      defaultMessage: 'Order',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.sortForm.orderFieldHelpText', {
      defaultMessage:
        'Sort order. Arrays containing a mix of strings and numbers are sorted lexicographically.',
    }),
  },
};

export const Sort: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.sortForm.fieldNameHelpText',
          { defaultMessage: 'Field containing array values to sort.' }
        )}
      />

      <UseField
        config={fieldsConfig.order}
        component={SelectField}
        componentProps={{
          euiFieldProps: {
            options: [
              {
                value: 'asc',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.sortForm.orderField.ascendingOption',
                  { defaultMessage: 'Ascending' }
                ),
              },
              {
                value: 'desc',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.sortForm.orderField.descendingOption',
                  { defaultMessage: 'Descending' }
                ),
              },
            ],
          },
        }}
        path="fields.order"
      />

      <TargetField />
    </>
  );
};
