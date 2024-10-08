/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { monaco } from '@kbn/monaco';
import { isEqual } from 'lodash';
import type { FC } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import pivotJsonSchema from '@kbn/json-schemas/src/put___transform__transform_id___pivot_schema.json';
import type { StepDefineFormHook } from '../step_define';

export const AdvancedPivotEditor: FC<StepDefineFormHook['advancedPivotEditor']> = memo(
  ({
    actions: { convertToJson, setAdvancedEditorConfig, setAdvancedPivotEditorApplyButtonEnabled },
    state: { advancedEditorConfigLastApplied, advancedEditorConfig },
  }) => {
    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorLabel', {
          defaultMessage: 'Pivot configuration object',
        })}
        data-test-subj="transformAdvancedPivotEditor"
      >
        <CodeEditor
          height={250}
          languageId={'json'}
          onChange={(d: string) => {
            setAdvancedEditorConfig(d);

            // Disable the "Apply"-Button if the config hasn't changed.
            if (advancedEditorConfigLastApplied === d) {
              setAdvancedPivotEditorApplyButtonEnabled(false);
              return;
            }

            // Try to parse the string passed on from the editor.
            // If parsing fails, the "Apply"-Button will be disabled
            try {
              JSON.parse(convertToJson(d));
              setAdvancedPivotEditorApplyButtonEnabled(true);
            } catch (e) {
              setAdvancedPivotEditorApplyButtonEnabled(false);
            }
          }}
          options={{
            ariaLabel: i18n.translate('xpack.transform.stepDefineForm.advancedEditorAriaLabel', {
              defaultMessage: 'Advanced pivot editor',
            }),
            automaticLayout: true,
            fontSize: 12,
            scrollBeyondLastLine: false,
            quickSuggestions: true,
            minimap: {
              enabled: false,
            },
            wordWrap: 'on',
            wrappingIndent: 'indent',
          }}
          value={advancedEditorConfig}
          editorDidMount={(editor: monaco.editor.IStandaloneCodeEditor) => {
            const editorModelUri: string = editor.getModel()?.uri.toString()!;
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
              validate: true,
              enableSchemaRequest: false,
              schemaValidation: 'error',
              schemas: [
                ...(monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas ?? []),
                {
                  uri: editorModelUri,
                  fileMatch: [editorModelUri],
                  schema: pivotJsonSchema,
                },
              ],
            });
          }}
        />
      </EuiFormRow>
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: StepDefineFormHook['advancedPivotEditor']) {
  return [props.state.advancedEditorConfigLastApplied, props.state.advancedEditorConfig];
}
