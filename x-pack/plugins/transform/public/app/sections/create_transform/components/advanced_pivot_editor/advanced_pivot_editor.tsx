/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import React, { memo, FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { CodeEditor } from '@kbn/kibana-react-plugin/public';

import { StepDefineFormHook } from '../step_define';

export const AdvancedPivotEditor: FC<StepDefineFormHook['advancedPivotEditor']> = memo(
  ({
    actions: { convertToJson, setAdvancedEditorConfig, setAdvancedPivotEditorApplyButtonEnabled },
    state: { advancedEditorConfigLastApplied, advancedEditorConfig, xJsonMode },
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
        />
      </EuiFormRow>
    );
  },
  (prevProps, nextProps) => isEqual(pickProps(prevProps), pickProps(nextProps))
);

function pickProps(props: StepDefineFormHook['advancedPivotEditor']) {
  return [props.state.advancedEditorConfigLastApplied, props.state.advancedEditorConfig];
}
