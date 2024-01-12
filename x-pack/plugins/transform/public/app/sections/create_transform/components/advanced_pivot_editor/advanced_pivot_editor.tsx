/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, type FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/code-editor';
import { XJson } from '@kbn/es-ui-shared-plugin/public';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

const { collapseLiteralStrings, useXJsonMode } = XJson;

export const AdvancedPivotEditor: FC = () => {
  const { setAdvancedEditorConfig, setAdvancedPivotEditorApplyButtonEnabled } = useWizardActions();
  const advancedEditorConfigLastApplied = useWizardSelector(
    (s) => s.advancedPivotEditor.advancedEditorConfigLastApplied
  );
  const advancedEditorConfig = useWizardSelector((s) => s.advancedPivotEditor.advancedEditorConfig);

  const { setXJson, xJson } = useXJsonMode(advancedEditorConfig);

  useEffect(() => {
    if (xJson !== advancedEditorConfig) {
      setAdvancedEditorConfig(xJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xJson]);

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
          setXJson(d);

          // Disable the "Apply"-Button if the config hasn't changed.
          if (advancedEditorConfigLastApplied === d) {
            setAdvancedPivotEditorApplyButtonEnabled(false);
            return;
          }

          // Try to parse the string passed on from the editor.
          // If parsing fails, the "Apply"-Button will be disabled
          try {
            JSON.parse(collapseLiteralStrings(d));
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
        value={xJson}
      />
    </EuiFormRow>
  );
};
