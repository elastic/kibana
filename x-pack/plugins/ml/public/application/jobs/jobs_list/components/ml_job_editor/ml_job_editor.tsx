/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { monaco, XJsonLang } from '@kbn/monaco';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { type EuiCodeEditorProps, XJson } from '@kbn/es-ui-shared-plugin/public';

const { expandLiteralStrings } = XJson;

export const ML_EDITOR_MODE = { TEXT: 'text', JSON: 'json', XJSON: XJsonLang.ID };

interface MlJobEditorProps {
  value: string;
  height?: string;
  width?: string;
  mode?: typeof ML_EDITOR_MODE[keyof typeof ML_EDITOR_MODE];
  readOnly?: boolean;
  syntaxChecking?: boolean;
  theme?: string;
  onChange?: EuiCodeEditorProps['onChange'];
  'data-test-subj'?: string;
  schema?: object;
}
export const MLJobEditor: FC<MlJobEditorProps> = ({
  value,
  height = '500px',
  width = '100%',
  mode = ML_EDITOR_MODE.JSON,
  readOnly = false,
  syntaxChecking = true,
  theme = 'textmate',
  onChange = () => {},
  'data-test-subj': dataTestSubj,
  schema,
}) => {
  if (mode === ML_EDITOR_MODE.XJSON) {
    try {
      value = expandLiteralStrings(value);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  return (
    <CodeEditor
      languageId={'json'}
      value={value}
      width={width}
      height={height}
      onChange={onChange}
      data-test-subj={dataTestSubj}
      editorDidMount={(editor: monaco.editor.IStandaloneCodeEditor) => {
        const editorModelUri: string = editor.getModel()?.uri.toString()!;
        if (schema) {
          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            enableSchemaRequest: false,
            schemaValidation: 'warning',
            schemas: [
              ...(monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas ?? []),
              {
                uri: editorModelUri,
                fileMatch: [editorModelUri],
                schema,
              },
            ],
          });
        }
      }}
    />
  );
};
