/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FieldConfig,
  FIELD_TYPES,
  fieldValidators,
  ToggleField,
  UseField,
  Field,
} from '../../../../../../shared_imports';

const { emptyField } = fieldValidators;

const fieldConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.fieldFieldLabel', {
    defaultMessage: 'Field',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.fieldRequiredError', {
          defaultMessage: 'A field value is required.',
        })
      ),
    },
  ],
};

const patternConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternFieldLabel', {
    defaultMessage: 'Pattern',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternRequiredError', {
          defaultMessage: 'A pattern value is required.',
        })
      ),
    },
  ],
};

const replacementConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.replacementFieldLabel', {
    defaultMessage: 'Replacement',
  }),
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.replacementRequiredError', {
          defaultMessage: 'A replacement value is required.',
        })
      ),
    },
  ],
};

const targetConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.targetFieldLabel', {
    defaultMessage: 'Target field (optional)',
  }),
};

const ignoreMissingConfig: FieldConfig = {
  defaultValue: false,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.ignoreMissingFieldLabel', {
    defaultMessage: 'Ignore missing',
  }),
  type: FIELD_TYPES.TOGGLE,
};

export const Gsub: FunctionComponent = () => {
  return (
    <>
      <UseField config={fieldConfig} component={Field} path="field" />

      <UseField config={patternConfig} component={Field} path="pattern" />

      <UseField config={replacementConfig} component={Field} path="replacement" />

      <UseField config={targetConfig} component={Field} path="target_field" />

      <UseField config={ignoreMissingConfig} component={ToggleField} path="ignore_missing" />
    </>
  );
};
