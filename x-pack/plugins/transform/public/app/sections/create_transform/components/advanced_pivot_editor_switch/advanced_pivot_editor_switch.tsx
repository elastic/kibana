/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { StepDefineFormContext } from '../step_define';
import { SwitchModal } from '../switch_modal';

export const AdvancedPivotEditorSwitch: FC = () => {
  const { actions, state } = useContext(StepDefineFormContext);

  return (
    <EuiFormRow>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorSwitchLabel', {
              defaultMessage: 'Advanced pivot editor',
            })}
            checked={state.isAdvancedPivotEditorEnabled}
            onChange={() => {
              if (
                state.isAdvancedPivotEditorEnabled &&
                (state.isAdvancedPivotEditorApplyButtonEnabled ||
                  state.advancedEditorConfig !== state.advancedEditorConfigLastApplied)
              ) {
                actions.setAdvancedEditorSwitchModalVisible(true);
                return;
              }

              actions.toggleAdvancedEditor();
            }}
            data-test-subj="transformAdvancedPivotEditorSwitch"
          />
          {state.isAdvancedEditorSwitchModalVisible && (
            <SwitchModal
              onCancel={() => actions.setAdvancedEditorSwitchModalVisible(false)}
              onConfirm={() => {
                actions.setAdvancedEditorSwitchModalVisible(false);
                actions.toggleAdvancedEditor();
              }}
              type={'pivot'}
            />
          )}
        </EuiFlexItem>
        {state.isAdvancedPivotEditorEnabled && (
          <EuiButton
            size="s"
            fill
            onClick={actions.applyAdvancedPivotEditorChanges}
            disabled={!state.isAdvancedPivotEditorApplyButtonEnabled}
          >
            {i18n.translate('xpack.transform.stepDefineForm.advancedEditorApplyButtonText', {
              defaultMessage: 'Apply changes',
            })}
          </EuiButton>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
