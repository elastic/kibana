/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, type FC } from 'react';

import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/code-editor';
import { isRuntimeMappings } from '@kbn/ml-runtime-field-utils';

import { useWizardSelector, useWizardActions } from '../state_management/create_transform_store';

const { collapseLiteralStrings, useXJsonMode } = XJson;

export const AdvancedRuntimeMappingsEditor: FC = () => {
  const advancedRuntimeMappingsConfig = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.advancedRuntimeMappingsConfig
  );
  const advancedRuntimeMappingsConfigLastApplied = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.advancedRuntimeMappingsConfigLastApplied
  );
  const { setAdvancedRuntimeMappingsConfig, setRuntimeMappingsEditorApplyButtonEnabled } =
    useWizardActions();

  const initialized = useRef(false);

  const { setXJson, xJson } = useXJsonMode(null);

  useEffect(() => {
    if (xJson !== advancedRuntimeMappingsConfig && initialized.current) {
      setAdvancedRuntimeMappingsConfig(xJson);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xJson]);

  useEffect(() => {
    if (xJson !== advancedRuntimeMappingsConfig) {
      setXJson(advancedRuntimeMappingsConfig);
      initialized.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedRuntimeMappingsConfig]);

  return (
    <div data-test-subj="transformAdvancedRuntimeMappingsEditor">
      <CodeEditor
        height={250}
        languageId={'json'}
        onChange={(d: string) => {
          setAdvancedRuntimeMappingsConfig(d);

          // Disable the "Apply"-Button if the config hasn't changed.
          if (advancedRuntimeMappingsConfigLastApplied === d) {
            setRuntimeMappingsEditorApplyButtonEnabled(false);
            return;
          }

          // Try to parse the string passed on from the editor.
          // If parsing fails, the "Apply"-Button will be disabled
          try {
            // if the user deletes the json in the editor
            // they should still be able to apply changes
            const isEmptyStr = d === '';
            const parsedJson = isEmptyStr ? {} : JSON.parse(collapseLiteralStrings(d));
            setRuntimeMappingsEditorApplyButtonEnabled(isEmptyStr || isRuntimeMappings(parsedJson));
          } catch (e) {
            setRuntimeMappingsEditorApplyButtonEnabled(false);
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
        value={advancedRuntimeMappingsConfig}
      />
    </div>
  );
};
