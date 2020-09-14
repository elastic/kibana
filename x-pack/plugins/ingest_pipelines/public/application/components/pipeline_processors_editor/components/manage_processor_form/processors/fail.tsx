/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { FIELD_TYPES, fieldValidators, UseField, Field } from '../../../../../../shared_imports';

import { FieldsConfig } from './shared';

const { emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  message: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.failForm.messageFieldLabel', {
      defaultMessage: 'Message',
    }),
    helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.failForm.messageHelpText', {
      defaultMessage: 'Error message returned by the processor.',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.failForm.valueRequiredError', {
            defaultMessage: 'A message is required.',
          })
        ),
      },
    ],
  },
};

export const Fail: FunctionComponent = () => {
  return <UseField component={Field} config={fieldsConfig.message} path="fields.message" />;
};
