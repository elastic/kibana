/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiCodeEditor, EuiFormRow, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { StepDefineFormContext } from '../step_define';

export const AdvancedPivotEditor: FC<{ advancedEditorHelpText: JSX.Element }> = ({
  advancedEditorHelpText,
}) => {
  const { actions, state } = useContext(StepDefineFormContext);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorLabel', {
        defaultMessage: 'Pivot configuration object',
      })}
      helpText={advancedEditorHelpText}
    >
      <EuiPanel grow={false} paddingSize="none">
        <EuiCodeEditor
          data-test-subj="transformAdvancedPivotEditor"
          mode={state.xJsonMode}
          width="100%"
          value={state.advancedEditorConfig}
          onChange={(d: string) => {
            actions.setAdvancedEditorConfig(d);

            // Disable the "Apply"-Button if the config hasn't changed.
            if (state.advancedEditorConfigLastApplied === d) {
              actions.setAdvancedPivotEditorApplyButtonEnabled(false);
              return;
            }

            // Try to parse the string passed on from the editor.
            // If parsing fails, the "Apply"-Button will be disabled
            try {
              JSON.parse(actions.convertToJson(d));
              actions.setAdvancedPivotEditorApplyButtonEnabled(true);
            } catch (e) {
              actions.setAdvancedPivotEditorApplyButtonEnabled(false);
            }
          }}
          setOptions={{
            fontSize: '12px',
          }}
          theme="textmate"
          aria-label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorAriaLabel', {
            defaultMessage: 'Advanced pivot editor',
          })}
        />
      </EuiPanel>
    </EuiFormRow>
  );
};
