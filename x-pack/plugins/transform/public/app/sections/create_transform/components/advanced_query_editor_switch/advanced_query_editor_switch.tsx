/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SwitchModal } from '../switch_modal';
import { StepDefineFormContext } from '../step_define';

export const AdvancedQueryEditorSwitch: FC = () => {
  const { actions, state } = useContext(StepDefineFormContext);

  return (
    <EuiFormRow>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate(
              'xpack.transform.stepDefineForm.advancedEditorSourceConfigSwitchLabel',
              {
                defaultMessage: 'Advanced query editor',
              }
            )}
            checked={state.isAdvancedSourceEditorEnabled}
            onChange={() => {
              if (state.isAdvancedSourceEditorEnabled && state.sourceConfigUpdated) {
                actions.setAdvancedSourceEditorSwitchModalVisible(true);
                return;
              }

              actions.toggleAdvancedSourceEditor();
            }}
            data-test-subj="transformAdvancedQueryEditorSwitch"
          />
          {state.isAdvancedSourceEditorSwitchModalVisible && (
            <SwitchModal
              onCancel={() => actions.setAdvancedSourceEditorSwitchModalVisible(false)}
              onConfirm={() => {
                actions.setAdvancedSourceEditorSwitchModalVisible(false);
                actions.toggleAdvancedSourceEditor(true);
              }}
              type={'source'}
            />
          )}
        </EuiFlexItem>
        {state.isAdvancedSourceEditorEnabled && (
          <EuiButton
            size="s"
            fill
            onClick={actions.applyAdvancedSourceEditorChanges}
            disabled={!state.isAdvancedSourceEditorApplyButtonEnabled}
          >
            {i18n.translate('xpack.transform.stepDefineForm.advancedSourceEditorApplyButtonText', {
              defaultMessage: 'Apply changes',
            })}
          </EuiButton>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
