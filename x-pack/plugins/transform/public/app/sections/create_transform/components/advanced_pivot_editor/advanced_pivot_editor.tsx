/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, type FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/code-editor';
import { XJson } from '@kbn/es-ui-shared-plugin/public';

import { useWizardActions } from '../../state_management/create_transform_store';
import { useWizardSelector } from '../../state_management/create_transform_store';
import { selectPreviewRequest } from '../../state_management/step_define_selectors';

import { useWizardContext } from '../wizard/wizard';

const { collapseLiteralStrings, useXJsonMode } = XJson;

export const AdvancedPivotEditor: FC = () => {
  const initialized = useRef(false);

  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const {
    setAdvancedEditorConfig,
    setAdvancedEditorConfigLastApplied,
    setAdvancedPivotEditorApplyButtonEnabled,
  } = useWizardActions();
  const isAdvancedPivotEditorEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorEnabled
  );
  const advancedEditorConfigLastApplied = useWizardSelector(
    (s) => s.advancedPivotEditor.advancedEditorConfigLastApplied
  );
  const advancedEditorConfig = useWizardSelector((s) => s.advancedPivotEditor.advancedEditorConfig);

  const { setXJson, xJson } = useXJsonMode(null);

  useEffect(() => {
    if (xJson !== advancedEditorConfig && initialized.current) {
      setAdvancedEditorConfig(xJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xJson]);

  useEffect(() => {
    if (xJson !== advancedEditorConfig) {
      setXJson(advancedEditorConfig);
      initialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedEditorConfig]);

  const previewRequest = useWizardSelector((s) => selectPreviewRequest(s, dataView));

  useEffect(() => {
    if (!isAdvancedPivotEditorEnabled) {
      const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
      setAdvancedEditorConfigLastApplied(stringifiedPivotConfig);
      setAdvancedEditorConfig(stringifiedPivotConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdvancedPivotEditorEnabled, previewRequest]);

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
