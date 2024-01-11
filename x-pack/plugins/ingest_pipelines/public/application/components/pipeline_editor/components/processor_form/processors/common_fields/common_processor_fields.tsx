/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { PainlessLang } from '@kbn/monaco';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';
import {
  FieldConfig,
  UseField,
  FIELD_TYPES,
  Field,
  ToggleField,
} from '../../../../../../../shared_imports';

import { TextEditor } from '../../field_components';
import { to, from, EDITOR_PX_HEIGHT } from '../shared';

const ignoreFailureConfig: FieldConfig<any> = {
  defaultValue: false,
  deserializer: to.booleanOrUndef,
  serializer: from.undefinedIfValue(false),
  label: i18n.translate(
    'xpack.ingestPipelines.pipelineEditor.commonFields.ignoreFailureFieldLabel',
    {
      defaultMessage: 'Ignore failures for this processor',
    }
  ),
  type: FIELD_TYPES.TOGGLE,
};

const ifConfig: FieldConfig = {
  serializer: from.emptyStringToUndefined,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.ifFieldLabel', {
    defaultMessage: 'Condition (optional)',
  }),
  helpText: (
    <FormattedMessage
      id="xpack.ingestPipelines.pipelineEditor.commonFields.ifFieldHelpText"
      defaultMessage="An {if} condition written as a Painless script: {exampleCondition}"
      values={{
        if: <EuiCode>{'if'}</EuiCode>,
        exampleCondition: <EuiCode>{"ctx?.network?.name == 'Guest'"}</EuiCode>,
      }}
    />
  ),
  type: FIELD_TYPES.TEXT,
};

const tagConfig: FieldConfig = {
  serializer: from.emptyStringToUndefined,
  label: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.tagFieldLabel', {
    defaultMessage: 'Tag (optional)',
  }),
  helpText: i18n.translate('xpack.ingestPipelines.pipelineEditor.commonFields.tagFieldHelpText', {
    defaultMessage: 'An identifier for the processor. Useful for debugging and metrics.',
  }),
  type: FIELD_TYPES.TEXT,
};

export const CommonProcessorFields: FunctionComponent = () => {
  const suggestionProvider = PainlessLang.getSuggestionProvider('processor_conditional');

  return (
    <section>
      <UseField
        data-test-subj="ifField"
        config={ifConfig}
        component={TextEditor}
        componentProps={{
          editorProps: {
            languageId: PainlessLang.ID,
            suggestionProvider,
            height: EDITOR_PX_HEIGHT.extraSmall,
            options: {
              lineNumbers: 'off',
              minimap: { enabled: false },
            },
          },
        }}
        path="fields.if"
      />

      <UseField data-test-subj="tagField" config={tagConfig} component={Field} path="fields.tag" />

      <UseField
        data-test-subj="ignoreFailureSwitch"
        config={ignoreFailureConfig}
        component={ToggleField}
        path="fields.ignore_failure"
      />
    </section>
  );
};
