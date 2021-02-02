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
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ComboBoxField,
} from '../../../../../../shared_imports';

import { FieldsConfig, to } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';

const { minLengthField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  formats: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.formatsFieldLabel', {
      defaultMessage: 'Formats',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.formatsFieldHelpText', {
      defaultMessage:
        'Expected date formats. Provided formats are applied sequentially. Accepts a Java time pattern, ISO8601, UNIX, UNIX_MS, or TAI64N formats.',
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
  /* Optional fields config */
  timezone: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.timezoneFieldLabel', {
      defaultMessage: 'Timezone (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.timezoneHelpText"
        defaultMessage="Timezone for the date. Defaults to {timezone}."
        values={{ timezone: <EuiCode inline>{'UTC'}</EuiCode> }}
      />
    ),
  },
  locale: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.localeFieldLabel', {
      defaultMessage: 'Locale (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.localeHelpText"
        defaultMessage="Locale for the date. Useful when parsing month or day names. Defaults to {timezone}."
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
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.dateForm.fieldNameHelpText',
          { defaultMessage: 'Field to convert.' }
        )}
      />

      <UseField config={fieldsConfig.formats} component={ComboBoxField} path="fields.formats" />

      <TargetField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.dateForm.targetFieldHelpText"
            defaultMessage="Output field. If empty, the input field is updated in place. Defaults to {defaultField}."
            values={{
              defaultField: <EuiCode inline>{'@timestamp'}</EuiCode>,
            }}
          />
        }
      />

      <UseField config={fieldsConfig.timezone} component={Field} path="fields.timezone" />

      <UseField config={fieldsConfig.locale} component={Field} path="fields.locale" />
    </>
  );
};
