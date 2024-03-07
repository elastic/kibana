/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/code-editor';

import { useWizardActions, useWizardSelector } from '../state_management/create_transform_store';

export const AdvancedSourceEditor: FC = () => {
  const advancedEditorSourceConfig = useWizardSelector(
    (s) => s.advancedSourceEditor.advancedSourceEditorConfig
  );
  const advancedSourceEditorConfigLastApplied = useWizardSelector(
    (s) => s.advancedSourceEditor.advancedSourceEditorConfigLastApplied
  );
  const {
    setAdvancedSourceEditorConfig,
    setAdvancedSourceEditorApplyButtonEnabled,
    setSearchString,
  } = useWizardActions();

  return (
    <div data-test-subj="transformAdvancedRuntimeMappingsEditor">
      <CodeEditor
        height={250}
        languageId={'json'}
        onChange={(d: string) => {
          setSearchString(undefined);
          setAdvancedSourceEditorConfig(d);

          // Disable the "Apply"-Button if the config hasn't changed.
          if (advancedSourceEditorConfigLastApplied === d) {
            setAdvancedSourceEditorApplyButtonEnabled(false);
            return;
          }

          // Try to parse the string passed on from the editor.
          // If parsing fails, the "Apply"-Button will be disabled
          try {
            JSON.parse(d);
            setAdvancedSourceEditorApplyButtonEnabled(true);
          } catch (e) {
            setAdvancedSourceEditorApplyButtonEnabled(false);
          }
        }}
        options={{
          ariaLabel: i18n.translate(
            'xpack.transform.stepDefineForm.advancedSourceEditorAriaLabel',
            {
              defaultMessage: 'Advanced query editor',
            }
          ),
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
        value={advancedEditorSourceConfig}
      />
    </div>
  );
};
