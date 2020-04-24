/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiCodeEditor, EuiFormRow, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { StepDefineFormContext } from '../step_define';

export const AdvancedSourceEditor: FC<{ advancedSourceEditorHelpText: JSX.Element }> = ({
  advancedSourceEditorHelpText,
}) => {
  const { actions, state } = useContext(StepDefineFormContext);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorLabel', {
          defaultMessage: 'Source query clause',
        })}
        helpText={advancedSourceEditorHelpText}
      >
        <EuiPanel grow={false} paddingSize="none">
          <EuiCodeEditor
            mode="json"
            width="100%"
            value={state.advancedEditorSourceConfig}
            onChange={(d: string) => {
              actions.setSearchString(undefined);
              actions.setAdvancedEditorSourceConfig(d);

              // Disable the "Apply"-Button if the config hasn't changed.
              if (state.advancedEditorSourceConfigLastApplied === d) {
                actions.setAdvancedSourceEditorApplyButtonEnabled(false);
                return;
              }

              // Try to parse the string passed on from the editor.
              // If parsing fails, the "Apply"-Button will be disabled
              try {
                JSON.parse(d);
                actions.setAdvancedSourceEditorApplyButtonEnabled(true);
              } catch (e) {
                actions.setAdvancedSourceEditorApplyButtonEnabled(false);
              }
            }}
            setOptions={{
              fontSize: '12px',
            }}
            theme="textmate"
            aria-label={i18n.translate(
              'xpack.transform.stepDefineForm.advancedSourceEditorAriaLabel',
              {
                defaultMessage: 'Advanced query editor',
              }
            )}
          />
        </EuiPanel>
      </EuiFormRow>
    </>
  );
};
