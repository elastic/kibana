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
  SelectField,
} from '../../../../../../shared_imports';

import { FieldsConfig, to } from './shared';
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
        defaultMessage: 'How to round the date when formatting the date into the index name.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRoundingRequiredError',
            {
              defaultMessage: 'A field value is required.',
            }
          )
        ),
      },
    ],
  },
  /* Optional fields config */
  index_name_prefix: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNamePrefixFieldLabel',
      {
        defaultMessage: 'Index name prefix (optional)',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNamePrefixFieldHelpText',
      { defaultMessage: 'A prefix of the index name to be prepended before the printed date.' }
    ),
  },
  index_name_format: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNameFormatFieldLabel',
      {
        defaultMessage: 'Index name format (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNameFormatFieldHelpText"
        defaultMessage="The format to be used when printing the parsed date into the index name. Default value is {value}."
        values={{ value: <EuiCode inline>{'yyyy-MM-dd'}</EuiCode> }}
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
        defaultMessage="An array of the expected date formats for parsing dates / timestamps in the document being preprocessed. Can be a java time pattern or one of the following formats: ISO8601, UNIX, UNIX_MS, or TAI64N. Default value is {value}."
        values={{ value: <EuiCode inline>{"yyyy-MM-dd'T'HH:mm:ss.SSSXX"}</EuiCode> }}
      />
    ),
  },
  timezone: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.timezoneFieldLabel',
      {
        defaultMessage: 'Timezone (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.timezoneHelpText"
        defaultMessage="The timezone to use when parsing the date and when date math index supports resolves expressions into concrete index names. Default value is {timezone}."
        values={{ timezone: <EuiCode inline>{'UTC'}</EuiCode> }}
      />
    ),
  },
  locale: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.localeFieldLabel',
      {
        defaultMessage: 'Locale (optional)',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexForm.localeHelpText"
        defaultMessage="The locale to use when parsing the date from the document being preprocessed, relevant when parsing month names or week days. Default value is {locale}."
        values={{ locale: <EuiCode inline>{'ENGLISH'}</EuiCode> }}
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
          { defaultMessage: 'The field to get the date or timestamp from.' }
        )}
      />

      <UseField
        config={fieldsConfig.date_rounding}
        component={SelectField}
        componentProps={{
          euiFieldProps: {
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
        config={fieldsConfig.index_name_prefix}
        component={Field}
        path="fields.index_name_prefix"
      />

      <UseField
        config={fieldsConfig.index_name_format}
        component={Field}
        path="fields.index_name_format"
      />

      <UseField
        config={fieldsConfig.date_formats}
        component={ComboBoxField}
        path="fields.date_formats"
      />

      <UseField config={fieldsConfig.timezone} component={Field} path="fields.timezone" />

      <UseField config={fieldsConfig.locale} component={Field} path="fields.locale" />
    </>
  );
};
