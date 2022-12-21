/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PainlessLang } from '@kbn/monaco';
import { EuiCode, EuiSwitch, EuiFormRow } from '@elastic/eui';

import {
  FIELD_TYPES,
  fieldValidators,
  UseField,
  Field,
  useFormData,
} from '../../../../../../shared_imports';

import { XJsonEditor, TextEditor } from '../field_components';

import { FieldsConfig, to, from, FormFieldsComponent, EDITOR_PX_HEIGHT } from './shared';

const { isJsonField, emptyField } = fieldValidators;

const fieldsConfig: FieldsConfig = {
  /* Required fields config */

  id: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.scriptForm.storedScriptIDFieldLabel',
      {
        defaultMessage: 'Stored script ID',
      }
    ),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.scriptForm.storedScriptIDFieldHelpText',
      {
        defaultMessage: 'ID of the stored script to run.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.scriptForm.idRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },

  source: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.scriptForm.sourceFieldLabel', {
      defaultMessage: 'Source',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.scriptForm.sourceFieldHelpText',
      {
        defaultMessage: 'Inline script to run.',
      }
    ),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.pipelineEditor.scriptForm.sourceRequiredError', {
            defaultMessage: 'A value is required.',
          })
        ),
      },
    ],
  },

  /* Optional fields config */
  lang: {
    type: FIELD_TYPES.TEXT,
    deserializer: String,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.scriptForm.langFieldLabel', {
      defaultMessage: 'Language (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.scriptForm.langFieldHelpText"
        defaultMessage="Script language. Defaults to {lang}."
        values={{
          lang: <EuiCode>{'painless'}</EuiCode>,
        }}
      />
    ),
  },

  params: {
    type: FIELD_TYPES.TEXT,
    deserializer: to.jsonString,
    serializer: from.optionalJson,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.scriptForm.paramsFieldLabel', {
      defaultMessage: 'Parameters',
    }),
    helpText: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.scriptForm.paramsFieldHelpText',
      {
        defaultMessage: 'Named parameters passed to the script as variables.',
      }
    ),
    validations: [
      {
        validator: (value) => {
          if (value.value) {
            return isJsonField(
              i18n.translate(
                'xpack.ingestPipelines.pipelineEditor.scriptForm.processorInvalidJsonError',
                {
                  defaultMessage: 'Invalid JSON',
                }
              )
            )(value);
          }
        },
      },
    ],
  },
};

export const Script: FormFieldsComponent = ({ initialFieldValues }) => {
  const [showId, setShowId] = useState(() => !!initialFieldValues?.id);
  const [scriptLanguage, setScriptLanguage] = useState<string>(PainlessLang.ID);

  const [{ fields }] = useFormData({ watch: 'fields.lang' });

  const suggestionProvider = PainlessLang.getSuggestionProvider('processor_conditional');

  useEffect(() => {
    const isPainlessLang = fields?.lang === 'painless' || fields?.lang === ''; // Scripting language defaults to painless if none specified
    setScriptLanguage(isPainlessLang ? PainlessLang.ID : 'plaintext');
  }, [fields]);

  return (
    <>
      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate(
            'xpack.ingestPipelines.pipelineEditor.scriptForm.useScriptIdToggleLabel',
            { defaultMessage: 'Run a stored script' }
          )}
          checked={showId}
          onChange={() => setShowId((v) => !v)}
        />
      </EuiFormRow>

      {showId ? (
        <UseField key="fields.id" path="fields.id" component={Field} config={fieldsConfig.id} />
      ) : (
        <>
          <UseField component={Field} config={fieldsConfig.lang} path="fields.lang" />

          <UseField
            key="fields.source"
            path="fields.source"
            component={TextEditor}
            componentProps={{
              editorProps: {
                languageId: scriptLanguage,
                suggestionProvider:
                  scriptLanguage === PainlessLang.ID ? suggestionProvider : undefined,
                height: EDITOR_PX_HEIGHT.medium,
                'aria-label': i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.scriptForm.sourceFieldAriaLabel',
                  {
                    defaultMessage: 'Source script JSON editor',
                  }
                ),
                options: {
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                },
              },
            }}
            config={fieldsConfig.source}
          />
        </>
      )}

      <UseField
        component={XJsonEditor}
        componentProps={{
          editorProps: {
            height: EDITOR_PX_HEIGHT.medium,
            'aria-label': i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.scriptForm.paramsFieldAriaLabel',
              {
                defaultMessage: 'Parameters JSON editor',
              }
            ),
          },
        }}
        config={fieldsConfig.params}
        path="fields.params"
      />
    </>
  );
};
