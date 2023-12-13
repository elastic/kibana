/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiFormRow,
  EuiCallOut,
  EuiSpacer,
  EuiButtonIcon,
  EuiText,
  EuiPopover,
  EuiSelectable,
  EuiSelectableOption,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { monaco, XJsonLang } from '@kbn/monaco';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { ActionVariable } from '@kbn/alerting-plugin/common';
import { AddMessageVariables } from '@kbn/alerts-ui-shared';
import { templateActionVariable } from '../lib';
import { SaveActionTemplateModal } from './save_action_template_modal';
import { useKibana } from '../../common';
import { getActionTemplates } from '../lib/action_connector_api/get_action_templates';

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
  buttonTitle?: string;
  connectorTypeId?: string;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  inputTargetValue?: string | null;
  label: string;
  errors?: string[];
  areaLabel?: string;
  onDocumentsChange: (data: string) => void;
  helpText?: JSX.Element;
  onBlur?: () => void;
  showButtonTitle?: boolean;
  canUseTemplate?: boolean;
  euiCodeEditorProps?: { [key: string]: any };
}

const { useXJsonMode } = XJson;

// Source ID used to insert text imperatively into the code editor,
// this value is only used to uniquely identify any single edit attempt.
// Multiple editors can use the same ID without any issues.
const EDITOR_SOURCE = 'json-editor-with-message-variables';

export const JsonEditorWithMessageVariables: React.FunctionComponent<Props> = ({
  buttonTitle,
  messageVariables,
  connectorTypeId,
  paramsProperty,
  inputTargetValue,
  label,
  errors,
  areaLabel,
  onDocumentsChange,
  helpText,
  onBlur,
  showButtonTitle,
  canUseTemplate,
  euiCodeEditorProps = {},
}) => {
  const { http } = useKibana().services;
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor>();
  const editorDisposables = useRef<monaco.IDisposable[]>([]);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTemplatePopoverOpen, setIsTemplatePopoverOpen] = useState<boolean>(false);
  const [templateOptions, setTemplateOptions] = useState<EuiSelectableOption[]>([]);
  const [loadedTemplates, setLoadedTemplates] = useState<Array<{ name: string; template: string }>>(
    []
  );

  const { convertToJson, setXJson, xJson } = useXJsonMode(inputTargetValue ?? null);

  useEffect(() => {
    if (!xJson && inputTargetValue) {
      setXJson(inputTargetValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTargetValue]);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        if (connectorTypeId) {
          const templates = await getActionTemplates({ http, connectorTypeId });
          setLoadedTemplates(templates);
          setTemplateOptions((templates ?? []).map((t) => ({ label: t.name })));
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchTemplate();
  }, [http, connectorTypeId]);

  const onTemplateSelect = useCallback(
    (selectedOptions: EuiSelectableOption[]) => {
      const selectedIndex = selectedOptions.findIndex((opt) => opt.checked === 'on');
      if (selectedIndex > -1 && selectedIndex < loadedTemplates.length) {
        setXJson(loadedTemplates[selectedIndex].template);
        // Keep the documents in sync with the editor content
        onDocumentsChange(convertToJson(loadedTemplates[selectedIndex].template));
      }
      setIsTemplatePopoverOpen(false);
    },
    [loadedTemplates, setXJson]
  );

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
        <EuiCallOut size="s" color="danger" iconType="warning" title={NO_EDITOR_ERROR_TITLE}>
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
    <>
      <EuiFormRow
        data-test-subj="actionJsonEditor"
        fullWidth
        error={errors}
        isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
        label={label}
        labelAppend={
          <>
            <EuiText size="xs">
              {canUseTemplate && (
                <>
                  {xJson.length > 0 && (
                    <EuiButtonIcon
                      id="saveButton"
                      data-test-subj="saveButton"
                      title="Save action template"
                      iconType="save"
                      onClick={() => setIsModalOpen(true)}
                    />
                  )}
                  <EuiPopover
                    button={
                      <EuiButtonIcon
                        id="loadButton"
                        data-test-subj="loadButton"
                        title="Load Template"
                        iconType="folderOpen"
                        onClick={() => setIsTemplatePopoverOpen(true)}
                      />
                    }
                    isOpen={isTemplatePopoverOpen}
                    closePopover={() => setIsTemplatePopoverOpen(false)}
                    panelPaddingSize="s"
                    anchorPosition="upRight"
                    panelStyle={{ minWidth: 350 }}
                  >
                    <EuiSelectable
                      data-test-subj={'messageVariablesSelectableList'}
                      options={templateOptions}
                      listProps={{
                        rowHeight: 50,
                        showIcons: false,
                        paddingSize: 'none',
                        textWrap: 'wrap',
                      }}
                      singleSelection
                      onChange={onTemplateSelect}
                    >
                      {(list) => list}
                    </EuiSelectable>
                  </EuiPopover>
                </>
              )}
              <AddMessageVariables
                buttonTitle={buttonTitle}
                messageVariables={messageVariables}
                onSelectEventHandler={onSelectMessageVariable}
                paramsProperty={paramsProperty}
                showButtonTitle={showButtonTitle}
              />
            </EuiText>
          </>
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
            {...euiCodeEditorProps}
            editorDidMount={onEditorMount}
            onChange={(xjson: string) => {
              setXJson(xjson);
              // Keep the documents in sync with the editor content
              onDocumentsChange(convertToJson(xjson));
            }}
          />
        </>
      </EuiFormRow>
      <SaveActionTemplateModal
        isOpen={isModalOpen}
        template={xJson}
        connectorTypeId={connectorTypeId ?? ''}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
