/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormSchema, FIELD_TYPES, fieldValidators, fieldFormatters } from '../../../shared_imports';

import { PipelineForm } from './types';

const { emptyField } = fieldValidators;
const { toInt } = fieldFormatters;

export const pipelineFormSchema: FormSchema<PipelineForm> = {
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate('xpack.ingestPipelines.form.nameFieldLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.form.pipelineNameRequiredError', {
            defaultMessage: 'Name is required.',
          })
        ),
      },
    ],
  },
  description: {
    type: FIELD_TYPES.TEXTAREA,
    label: i18n.translate('xpack.ingestPipelines.form.descriptionFieldLabel', {
      defaultMessage: 'Description (optional)',
    }),
  },
  version: {
    type: FIELD_TYPES.NUMBER,
    label: i18n.translate('xpack.ingestPipelines.form.versionFieldLabel', {
      defaultMessage: 'Version (optional)',
    }),
    formatters: [toInt],
  },
};
