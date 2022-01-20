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
  SelectField,
} from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';
import { FieldNameField } from './common_fields/field_name_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */
  date_rounding: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRoundingFieldLabel',
      {
        defaultMessage: 'Date rounding',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRoundingFieldHelpText',
      {
        defaultMessage:
          'Time period used to round the date when formatting the date into the index name.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRoundingRequiredError',
            {
              defaultMessage: 'A date rounding value is required.',
            }
          )
        ),
      },
    ],
  },
  /* Optional fields config */
  index_name_prefix: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNamePrefixFieldLabel',
      {
        defaultMessage: 'Index name prefix (optional)',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNamePrefixFieldHelpText',
      { defaultMessage: 'Prefix to add before the printed date in the index name.' }
    ),
  },
  index_name_format: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNameFormatFieldLabel',
      {
        defaultMessage: 'Index name format (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNameFormatFieldHelpText"
        defaultMessage="Date format used to print the parsed date into the index name. Defaults to {value}."
        values={{ value: <EuiCode>{'yyyy-MM-dd'}</EuiCode> }}
      />
    ),
  },
  date_formats: {
    type: FIELD_TYPES.COMBO_BOX,
    serializer: (v: string[]) => {
      return v.length ? v : undefined;
    },
    deserializer: to.arrayOfStrings,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateFormatsFieldLabel',
      {
        defaultMessage: 'Date formats (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateFormatsHelpText"
        defaultMessage="Expected date formats. Provided formats are applied sequentially. Accepts a Java time pattern, ISO8601, UNIX, UNIX_MS, or TAI64N formats. Defaults to {value}."
        values={{ value: <EuiCode>{"yyyy-MM-dd'T'HH:mm:ss.SSSXX"}</EuiCode> }}
      />
    ),
  },
  timezone: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.timezoneFieldLabel',
      {
        defaultMessage: 'Timezone (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.timezoneHelpText"
        defaultMessage="Timezone used when parsing the date and constructing the index name expression. Defaults to {timezone}."
        values={{ timezone: <EuiCode>{'UTC'}</EuiCode> }}
      />
    ),
  },
  locale: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.localeFieldLabel',
      {
        defaultMessage: 'Locale (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexForm.localeHelpText"
        defaultMessage="Locale to use when parsing the date. Useful when parsing month or day names. Defaults to {locale}."
        values={{ locale: <EuiCode>{'ENGLISH'}</EuiCode> }}
      />
    ),
  },
};

/**
 * Disambiguate from global Date object
 */
export const DateIndexName: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.fieldNameHelpText',
          { defaultMessage: 'Field containing the date or timestamp.' }
        )}
      />

      <UseField
        config={fieldsConfig.date_rounding}
        component={SelectField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'dateRoundingField',
            options: [
              {
                value: 'y',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.year',
                  { defaultMessage: 'Year' }
                ),
              },
              {
                value: 'M',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.month',
                  { defaultMessage: 'Month' }
                ),
              },
              {
                value: 'w',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.week',
                  { defaultMessage: 'Week' }
                ),
              },
              {
                value: 'd',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.day',
                  { defaultMessage: 'Day' }
                ),
              },
              {
                value: 'h',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.hour',
                  { defaultMessage: 'Hour' }
                ),
              },
              {
                value: 'm',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.minute',
                  { defaultMessage: 'Minute' }
                ),
              },
              {
                value: 's',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRounding.second',
                  { defaultMessage: 'Second' }
                ),
              },
            ],
          },
        }}
        path="fields.date_rounding"
      />

      <UseField
        data-test-subj="indexNamePrefixField"
        config={fieldsConfig.index_name_prefix}
        component={Field}
        path="fields.index_name_prefix"
      />

      <UseField
        data-test-subj="indexNameFormatField"
        config={fieldsConfig.index_name_format}
        component={Field}
        path="fields.index_name_format"
      />

      <UseField
        data-test-subj="dateFormatsField"
        config={fieldsConfig.date_formats}
        component={ComboBoxField}
        path="fields.date_formats"
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
    </>
  );
};
