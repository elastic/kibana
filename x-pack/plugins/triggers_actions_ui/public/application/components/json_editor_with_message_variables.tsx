/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiFormRow, EuiCallOut, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { monaco, XJsonLang } from '@kbn/monaco';

import './add_message_variables.scss';
import { XJson } from '../../../../../../src/plugins/es_ui_shared/public';
import { CodeEditor } from '../../../../../../src/plugins/kibana_react/public';

import { AddMessageVariables } from './add_message_variables';
import { ActionVariable } from '../../../../alerting/common';
import { templateActionVariable } from '../lib';

const NO_EDITOR_ERROR_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.jsonEditorWithMessageVariable.noEditorErrorTitle',
  {
    defaultMessage: 'Unable to add message variable',
  }
);

const NO_EDITOR_ERROR_MESSAGE = i18n.translate(
  'xpack.triggersActionsUI.components.jsonEditorWithMessageVariable.noEditorErrorMessage',
  {
    defaultMessage: 'Editor was not found, please refresh page and try again',
  }
);

interface Props {
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  inputTargetValue?: string;
  label: string;
  errors?: string[];
  areaLabel?: string;
  onDocumentsChange: (data: string) => void;
  helpText?: JSX.Element;
  onBlur?: () => void;
}

const { useXJsonMode } = XJson;

// Source ID used to insert text imperatively into the code editor,
// this value is only used to uniquely identify any single edit attempt.
// Multiple editors can use the same ID without any issues.
const EDITOR_SOURCE = 'json-editor-with-message-variables';

export const JsonEditorWithMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  inputTargetValue,
  label,
  errors,
  areaLabel,
  onDocumentsChange,
  helpText,
  onBlur,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const editorDisposables = useRef<monaco.IDisposable[]>([]);
  const [showErrorMessage, setShowErrorMessage] = useState(false);

  const { convertToJson, setXJson, xJson } = useXJsonMode(inputTargetValue ?? null);

  const onSelectMessageVariable = (variable: ActionVariable) => {
    const editor = editorRef.current;
    if (!editor) {
      setShowErrorMessage(true);
      return;
    }
    const cursorPosition = editor.getSelection();
    const templatedVar = templateActionVariable(variable);

    let newValue = '';
    if (cursorPosition) {
      editor.executeEdits(EDITOR_SOURCE, [
        {
          range: cursorPosition,
          text: templatedVar,
        },
      ]);
      newValue = editor.getValue();
    } else {
      newValue = templatedVar;
    }
    setShowErrorMessage(false);
    setXJson(newValue);
    // Keep the documents in sync with the editor content
    onDocumentsChange(convertToJson(newValue));
  };

  const registerEditorListeners = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editorDisposables.current.push(
      editor.onDidBlurEditorWidget(() => {
        onBlur?.();
      })
    );
  }, [onBlur]);

  const unregisterEditorListeners = () => {
    editorDisposables.current.forEach((d) => {
      d.dispose();
    });
    editorDisposables.current = [];
  };

  const onEditorMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    registerEditorListeners();
  };

  const renderErrorMessage = () => {
    if (!showErrorMessage) {
      return null;
    }
    return (
      <>
        <EuiSpacer size="s" />
        <EuiCallOut size="s" color="danger" iconType="alert" title={NO_EDITOR_ERROR_TITLE}>
          <p>{NO_EDITOR_ERROR_MESSAGE}</p>
        </EuiCallOut>
        <EuiSpacer size="s" />
      </>
    );
  };

  useEffect(() => {
    registerEditorListeners();
    return () => unregisterEditorListeners();
  }, [registerEditorListeners]);

  return (
    <EuiFormRow
      fullWidth
      error={errors}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      label={label}
      labelAppend={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={onSelectMessageVariable}
          paramsProperty={paramsProperty}
        />
      }
      helpText={helpText}
    >
      <>
        {renderErrorMessage()}
        <CodeEditor
          languageId={XJsonLang.ID}
          options={{
            renderValidationDecorations: xJson ? 'on' : 'off', // Disable error underline when empty
            lineNumbers: 'on',
            fontSize: 14,
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine: false,
            folding: true,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
          value={xJson}
          width="100%"
          height="200px"
          data-test-subj={`${paramsProperty}JsonEditor`}
          aria-label={areaLabel}
          editorDidMount={onEditorMount}
          onChange={(xjson: string) => {
            setXJson(xjson);
            // Keep the documents in sync with the editor content
            onDocumentsChange(convertToJson(xjson));
          }}
        />
      </>
    </EuiFormRow>
  );
};
