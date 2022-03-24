/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ComboBoxField,
} from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';
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
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.formatsFieldHelpText"
        defaultMessage="Expected date formats. Provided formats are applied sequentially. Accepts a Java time pattern or one of the following formats: {allowedFormats}."
        values={{
          allowedFormats: (
            <>
              <EuiCode>{'ISO8601'}</EuiCode>,<EuiCode>{'UNIX'}</EuiCode>,
              <EuiCode>{'UNIX_MS'}</EuiCode>,<EuiCode>{'TAI64N'}</EuiCode>
            </>
          ),
        }}
      />
    ),
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
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.timezoneFieldLabel', {
      defaultMessage: 'Timezone (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.timezoneHelpText"
        defaultMessage="Timezone for the date. Defaults to {timezone}."
        values={{ timezone: <EuiCode>{'UTC'}</EuiCode> }}
      />
    ),
  },
  locale: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.localeFieldLabel', {
      defaultMessage: 'Locale (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.localeHelpText"
        defaultMessage="Locale for the date. Useful when parsing month or day names. Defaults to {timezone}."
        values={{ timezone: <EuiCode>{'ENGLISH'}</EuiCode> }}
      />
    ),
  },
  output_format: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.dateForm.outputFormatFieldLabel', {
      defaultMessage: 'Output format (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateForm.outputFormatHelpText"
        defaultMessage="Format to use when writing the date to {targetField}. Accepts a Java time pattern or one of the following formats: {allowedFormats}. Defaults to {defaultFormat}."
        values={{
          targetField: <EuiCode>{'target_field'}</EuiCode>,
          allowedFormats: (
            <>
              <EuiCode>{'ISO8601'}</EuiCode>,<EuiCode>{'UNIX'}</EuiCode>,
              <EuiCode>{'UNIX_MS'}</EuiCode>,<EuiCode>{'TAI64N'}</EuiCode>
            </>
          ),
          defaultFormat: <EuiCode>{`yyyy-MM-dd'T'HH:mm:ss.SSSXXX`}</EuiCode>,
        }}
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

      <UseField
        data-test-subj="formatsValueField"
        config={fieldsConfig.formats}
        component={ComboBoxField}
        path="fields.formats"
      />

      <TargetField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.dateForm.targetFieldHelpText"
            defaultMessage="Output field. If empty, the input field is updated in place. Defaults to {defaultField}."
            values={{
              defaultField: <EuiCode>{'@timestamp'}</EuiCode>,
            }}
          />
        }
      />

      <UseField
        data-test-subj="timezoneField"
        config={fieldsConfig.timezone}
        component={Field}
        path="fields.timezone"
      />

      <UseField
        data-test-subj="localeField"
        config={fieldsConfig.locale}
        component={Field}
        path="fields.locale"
      />

      <UseField
        data-test-subj="outputFormatField"
        config={fieldsConfig.output_format}
        component={Field}
        path="fields.output_format"
      />
    </>
  );
};
