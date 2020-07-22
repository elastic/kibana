/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
} from '../../../../../../shared_imports';

import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';

const { emptyField } = fieldValidators;

const fieldsConfig: Record<string, FieldConfig> = {
  pattern: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dissectForm.patternFieldLabel', {
      defaultMessage: 'Pattern',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.dissectForm.patternRequiredError', {
            defaultMessage: 'A pattern value is required.',
          })
        ),
      },
    ],
  },
  append_separator: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dissectForm.appendSeparatorparaotrFieldLabel',
      {
        defaultMessage: 'Append separator',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dissectForm.appendSeparatorHelpText"
        defaultMessage="Default value is {value}."
        values={{ value: <EuiCode inline>{'""'}</EuiCode> }}
      />
    ),
  },
};

export const Dissect: FunctionComponent = () => {
  return (
    <>
      <FieldNameField />

      <UseField config={fieldsConfig.pattern} component={Field} path="fields.pattern" />

      <UseField
        config={fieldsConfig.append_separator}
        component={Field}
        path="fields.append_separator"
      />

      <IgnoreMissingField />
    </>
  );
};
