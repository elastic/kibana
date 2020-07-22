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

import { FieldsConfig, isArrayOfStrings } from './shared';
import { FieldNameField } from './common_fields/field_name_field';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  date_rounding: {
    type: FIELD_TYPES.SELECT,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateRoundingFieldLabel',
      {
        defaultMessage: 'Date rounding',
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
  index_name_prefix: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNamePrefixFieldLabel',
      {
        defaultMessage: 'Index name prefix',
      }
    ),
  },
  index_name_format: {
    type: FIELD_TYPES.TEXT,
    serializer: (v) => (v ? v : undefined),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.indexNameFormatFieldLabel',
      {
        defaultMessage: 'Index name format',
      }
    ),
  },
  date_formats: {
    type: FIELD_TYPES.COMBO_BOX,
    serializer: (v: string[]) => {
      return v.length ? v : undefined;
    },
    deserializer: (v) => {
      return isArrayOfStrings(v) ? v : [];
    },
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateFormatsFieldLabel',
      {
        defaultMessage: 'Date formats',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.dateFormatsHelpText"
        defaultMessage="Default value is {value}."
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
        defaultMessage: 'Timezone',
      }
    ),
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
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.dateIndexNameForm.localeFieldLabel',
      {
        defaultMessage: 'Locale',
      }
    ),
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
export const DateIndexName: FunctionComponent = () => {
  return (
    <>
      <FieldNameField />

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
