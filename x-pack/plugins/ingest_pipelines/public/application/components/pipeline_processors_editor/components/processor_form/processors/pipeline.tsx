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
  /* Required fields config */
  name: {
    type: FIELD_TYPES.TEXT,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.pipelineForm.pipelineNameFieldLabel',
      {
        defaultMessage: 'Pipeline name',
      }
    ),
    deserializer: String,
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.pipelineForm.pipelineNameFieldHelpText',
      {
        defaultMessage: 'Name of the ingest pipeline to run.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.pipelineForm.pipelineNameRequiredError',
            {
              defaultMessage: 'A value is required.',
            }
          )
        ),
      },
    ],
  },
};

export const Pipeline: FunctionComponent = () => {
  return <UseField config={fieldsConfig.name} component={Field} path="fields.name" />;
};
