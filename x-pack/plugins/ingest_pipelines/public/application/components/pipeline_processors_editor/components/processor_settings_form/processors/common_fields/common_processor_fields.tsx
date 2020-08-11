/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import {
  FieldConfig,
  UseField,
  FIELD_TYPES,
  Field,
  ToggleField,
} from '../../../../../../../shared_imports';

import { TextEditor } from '../../field_components';

const ignoreFailureConfig: FieldConfig = {
  defaultValue: false,
  serializer: (v) => (v === false ? undefined : v),
  deserializer: (v) => (typeof v === 'boolean' ? v : undefined),
  label: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreFailureFieldLabel',
    {
      defaultMessage: 'Ignore failure',
    }
  ),
  type: FIELD_TYPES.TOGGLE,
};

const ifConfig: FieldConfig = {
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.ifFieldLabel', {
    defaultMessage: 'Condition (optional)',
  }),
  type: FIELD_TYPES.TEXT,
};

const tagConfig: FieldConfig = {
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.tagFieldLabel', {
    defaultMessage: 'Tag (optional)',
  }),
  type: FIELD_TYPES.TEXT,
};

export const CommonProcessorFields: FunctionComponent = () => {
  return (
    <>
      <UseField config={ignoreFailureConfig} component={ToggleField} path="fields.ignore_failure" />

      <UseField
        config={ifConfig}
        component={TextEditor}
        componentProps={{
          editorProps: {
            language: 'painless',
            height: 75,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.if"
      />

      <UseField config={tagConfig} component={Field} path="fields.tag" />
    </>
  );
};
