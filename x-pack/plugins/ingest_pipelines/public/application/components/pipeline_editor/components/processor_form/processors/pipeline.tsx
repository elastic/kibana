/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  ToggleField,
} from '../../../../../../shared_imports';

import { FieldsConfig, from, to } from './shared';

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
  /* Optional field configs */
  ignore_missing_pipeline: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.pipelineForm.ignoreMissingPipelineFieldLabel',
      {
        defaultMessage: 'Ignore missing pipeline',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.pipelineForm.ignoreMissingPipelineFieldHelpText',
      {
        defaultMessage: 'Ignore missing pipelines instead of failing.',
      }
    ),
  },
};

export const Pipeline: FunctionComponent = () => {
  return (
    <>
      <UseField
        data-test-subj="pipelineNameField"
        config={fieldsConfig.name}
        component={Field}
        path="fields.name"
      />

      <UseField
        data-test-subj="ignoreMissingPipelineSwitch"
        config={fieldsConfig.ignore_missing_pipeline}
        component={ToggleField}
        path="fields.ignore_missing_pipeline"
      />
    </>
  );
};
