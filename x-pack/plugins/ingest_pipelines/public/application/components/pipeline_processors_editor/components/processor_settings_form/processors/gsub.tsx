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
  FormRow,
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

export const Gsub: FunctionComponent = () => {
  return (
    <>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.fieldFieldTitle', {
          defaultMessage: 'Field',
        })}
      >
        <UseField config={fieldConfig} component={Field} path="field" />
      </FormRow>
      <FormRow
        title={i18n.translate('xpack.ingestPipelines.pipelineEditor.gsubForm.patternFieldTitle', {
          defaultMessage: 'Pattern',
        })}
      >
        <UseField config={patternConfig} component={Field} path="pattern" />
      </FormRow>
      <FormRow
        title={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.gsubForm.replacementFieldTitle',
          {
            defaultMessage: 'Replacement',
          }
        )}
      >
        <UseField config={replacementConfig} component={Field} path="replacement" />
      </FormRow>
    </>
  );
};
