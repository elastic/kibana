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
import { to, from } from '../shared';

const ignoreFailureConfig: FieldConfig = {
  defaultValue: false,
  deserializer: to.booleanOrUndef,
  serializer: from.defaultBoolToUndef(false),
  label: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreFailureFieldLabel',
    {
      defaultMessage: 'Ignore failure',
    }
  ),
  helpText: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreFailureHelpText',
    { defaultMessage: 'Ignore failures for this processor.' }
  ),
  type: FIELD_TYPES.TOGGLE,
};

const ifConfig: FieldConfig = {
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.ifFieldLabel', {
    defaultMessage: 'Condition (optional)',
  }),
  helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.ifFieldHelpText', {
    defaultMessage: 'Conditionally execute this processor.',
  }),
  type: FIELD_TYPES.TEXT,
};

const tagConfig: FieldConfig = {
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.tagFieldLabel', {
    defaultMessage: 'Tag (optional)',
  }),
  helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.tagFieldHelpText', {
    defaultMessage: 'An identifier for this processor. Useful for debugging and metrics.',
  }),
  type: FIELD_TYPES.TEXT,
};

export const CommonProcessorFields: FunctionComponent = () => {
  return (
    <section>
      <UseField
        config={ifConfig}
        component={TextEditor}
        componentProps={{
          editorProps: {
            languageId: 'painless',
            height: 75,
            options: { minimap: { enabled: false } },
          },
        }}
        path="fields.if"
      />

      <UseField config={tagConfig} component={Field} path="fields.tag" />

      <UseField config={ignoreFailureConfig} component={ToggleField} path="fields.ignore_failure" />
    </section>
  );
};
