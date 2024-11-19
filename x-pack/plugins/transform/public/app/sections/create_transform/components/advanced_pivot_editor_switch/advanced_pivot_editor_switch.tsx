/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SwitchModal } from '../switch_modal';

import type { StepDefineFormHook } from '../step_define';

export const AdvancedPivotEditorSwitch: FC<StepDefineFormHook> = ({
  advancedPivotEditor: {
    actions: { setAdvancedEditorSwitchModalVisible, toggleAdvancedEditor },
    state: {
      advancedEditorConfig,
      advancedEditorConfigLastApplied,
      isAdvancedEditorSwitchModalVisible,
      isAdvancedPivotEditorEnabled,
      isAdvancedPivotEditorApplyButtonEnabled,
    },
  },
}) => {
  return (
    <EuiFormRow>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorSwitchLabel', {
              defaultMessage: 'Edit JSON config',
            })}
            checked={isAdvancedPivotEditorEnabled}
            onChange={() => {
              if (
                isAdvancedPivotEditorEnabled &&
                (isAdvancedPivotEditorApplyButtonEnabled ||
                  advancedEditorConfig !== advancedEditorConfigLastApplied)
              ) {
                setAdvancedEditorSwitchModalVisible(true);
                return;
              }

              toggleAdvancedEditor();
            }}
            data-test-subj="transformAdvancedPivotEditorSwitch"
          />
          {isAdvancedEditorSwitchModalVisible && (
            <SwitchModal
              onCancel={() => setAdvancedEditorSwitchModalVisible(false)}
              onConfirm={() => {
                setAdvancedEditorSwitchModalVisible(false);
                toggleAdvancedEditor();
              }}
              type={'pivot'}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
