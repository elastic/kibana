/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { StepDefineFormHook } from '../step_define';

export const AdvancedSourceEditor: FC<StepDefineFormHook> = ({
  searchBar: {
    actions: { setSearchString },
  },
  advancedSourceEditor: {
    actions: { setAdvancedEditorSourceConfig, setAdvancedSourceEditorApplyButtonEnabled },
    state: { advancedEditorSourceConfig, advancedEditorSourceConfigLastApplied },
  },
}) => {
  return (
    <div data-test-subj="transformAdvancedRuntimeMappingsEditor">
      <CodeEditor
        height={250}
        languageId={'json'}
        onChange={(d: string) => {
          setSearchString(undefined);
          setAdvancedEditorSourceConfig(d);

          // Disable the "Apply"-Button if the config hasn't changed.
          if (advancedEditorSourceConfigLastApplied === d) {
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
