/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { FieldsConfig, from, to } from './shared';
import { TargetField } from './common_fields/target_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import {
  FIELD_TYPES,
  Field,
  UseField,
  SelectField,
  ComboBoxField,
  fieldValidators,
} from '../../../../../../shared_imports';

const fieldsConfig: FieldsConfig = {
  fields: {
    type: FIELD_TYPES.COMBO_BOX,
    deserializer: to.arrayOfStrings,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.fingerprint.fieldNameField', {
      defaultMessage: 'Fields',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.fingerprint.fieldNameHelpText', {
      defaultMessage: 'Fields to remove.',
    }),
    validations: [
      {
        validator: fieldValidators.emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.fingerprint.fieldNameRequiredError', {
            defaultMessage: 'A field value is required.',
          })
        ),
      },
    ],
  },
  salt: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.fingerprint.saltFieldLabel', {
      defaultMessage: 'Salt (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.fingerprint.saltHelpText"
        defaultMessage="Salt value for the hash function."
      />
    ),
  },
  method: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.fingerprint.methodFieldLabel', {
      defaultMessage: 'Method (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.fingerprint.methodHelpText"
        defaultMessage="The hash method used to compute the fingerprint. Defaults to {value}."
        values={{ value: <EuiCode>{'SHA-1'}</EuiCode> }}
      />
    )
  },
};

export const Fingerprint: FunctionComponent = () => {
  return (
    <>
      <UseField
        config={fieldsConfig.fields}
        component={ComboBoxField}
        path="fields.fields"
        data-test-subj="fieldsValueField"
      />

      <TargetField />

      <UseField
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'methodsValueField',
            options: [
              {
                value: 'MD5',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.fingerprint.md5Option',
                  { defaultMessage: 'MD5' }
                ),
              },
              {
                value: 'SHA-1',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.fingerprint.sha1Option',
                  { defaultMessage: 'SHA-1' }
                ),
              },
              {
                value: 'SHA-256',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.fingerprint.sha256Option',
                  { defaultMessage: 'SHA-256' }
                ),
              },
              {
                value: 'SHA-512',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.fingerprint.sha512Option',
                  { defaultMessage: 'SHA-512' }
                ),
              },
              {
                value: 'MurmurHash3',
                text: i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.fingerprint.murmurhash3Option',
                  { defaultMessage: 'MurmurHash3' }
                ),
              },
            ],
          },
        }}
        config={fieldsConfig.method}
        component={SelectField}
        path="fields.method"
      />

      <UseField
        config={fieldsConfig.salt}
        component={Field}
        path="fields.salt"
        data-test-subj="saltValueField"
      />

      <IgnoreMissingField />
    </>
  );
};
