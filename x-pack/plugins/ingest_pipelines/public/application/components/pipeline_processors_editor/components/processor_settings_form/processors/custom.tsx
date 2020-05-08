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
  UseField,
  JsonEditorField,
} from '../../../../../../shared_imports';

const { emptyField, isJsonField } = fieldValidators;

const customConfig: FieldConfig = {
  type: FIELD_TYPES.TEXT,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.customForm.optionsFieldLabel', {
    defaultMessage: 'Configuration options',
  }),
  serializer: (value: string) => {
    try {
      return JSON.parse(value);
    } catch (error) {
      // swallow error and return non-parsed value;
      return value;
    }
  },
  deserializer: (value: any) => {
    if (value === '') {
      return '{\n\n}';
    }
    return JSON.stringify(value, null, 2);
  },
  validations: [
    {
      validator: emptyField(
        i18n.translate('xpack.ingestPipelines.form.processorsRequiredError', {
          defaultMessage: 'Processors are required.',
        })
      ),
    },
    {
      validator: isJsonField(
        i18n.translate('xpack.ingestPipelines.form.processorsJsonError', {
          defaultMessage: 'The input is not valid.',
        })
      ),
    },
  ],
};

interface Props {
  defaultOptions?: any;
}

export const Custom: FunctionComponent<Props> = ({ defaultOptions }) => {
  return (
    <UseField
      path="customOptions"
      component={JsonEditorField}
      config={customConfig}
      defaultValue={defaultOptions}
      componentProps={{
        euiCodeEditorProps: {
          height: '300px',
          'aria-label': i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.customForm.optionsFieldAriaLabel',
            {
              defaultMessage: 'Configuration options JSON editor',
            }
          ),
        },
      }}
    />
  );
};
