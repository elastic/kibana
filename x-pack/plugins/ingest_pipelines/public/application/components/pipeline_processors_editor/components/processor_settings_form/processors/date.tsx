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
  ComboBoxField,
} from '../../../../../../shared_imports';

import { isArrayOfStrings } from './shared';

const { emptyField, minLengthField } = fieldValidators;

export const fieldsConfig: Record<string, FieldConfig> = {
  field: {
    type: FIELD_TYPES.TEXT,
    serializer: String,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.fieldFieldLabel', {
      defaultMessage: 'Field',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.fieldRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
  target_field: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? undefined : v),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.targetFieldFieldLabel', {
      defaultMessage: 'Target field',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.targetFieldHelpText"
        defaultMessage="Default field is {defaultField}"
        values={{
          defaultField: <EuiCode inline>{'@timestamp'}</EuiCode>,
        }}
      />
    ),
  },
  formats: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: (v) => {
      return isArrayOfStrings(v) ? v : [];
    },
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.formatsFieldLabel', {
      defaultMessage: 'Formats',
    }),
    validations: [
      {
        validator: minLengthField({
          length: 1,
          message: i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.dateForm.formatsRequiredError',
            {
              defaultMessage: 'A value for formats is required.',
            }
          ),
        }),
      },
    ],
  },
  timezone: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.timezoneFieldLabel', {
      defaultMessage: 'Timezone',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.timezoneHelpText"
        defaultMessage="Default value is {timezone}"
        values={{ timezone: <EuiCode inline>{'UTC'}</EuiCode> }}
      />
    ),
  },
  locale: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.localeFieldLabel', {
      defaultMessage: 'Locale',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.localeHelpText"
        defaultMessage="Default value is {timezone}"
        values={{ timezone: <EuiCode inline>{'ENGLISH'}</EuiCode> }}
      />
    ),
  },
};

/**
 * Disambiguate from global Date object
 */
export const DateProcessor: FunctionComponent = () => {
  return (
    <>
      <UseField config={fieldsConfig.field} component={Field} path="fields.field" />

      <UseField config={fieldsConfig.formats} component={ComboBoxField} path="fields.formats" />

      <UseField config={fieldsConfig.target_field} component={Field} path="fields.target_field" />

      <UseField config={fieldsConfig.timezone} component={Field} path="fields.timezone" />

      <UseField config={fieldsConfig.locale} component={Field} path="fields.locale" />
    </>
  );
};
