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

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { selectPreviewRequest } from '../../state_management/step_define_selectors';

import { useDataView } from '../wizard/wizard';

export const AdvancedPivotEditorSwitch: FC = () => {
  const dataView = useDataView();

  const advancedEditorConfig = useWizardSelector((s) => s.advancedPivotEditor.advancedEditorConfig);
  const advancedEditorConfigLastApplied = useWizardSelector(
    (s) => s.advancedPivotEditor.advancedEditorConfigLastApplied
  );
  const isAdvancedPivotEditorApplyButtonEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorApplyButtonEnabled
  );
  const isAdvancedPivotEditorEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorEnabled
  );
  const isAdvancedEditorSwitchModalVisible = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedEditorSwitchModalVisible
  );
  const previewRequest = useWizardSelector((s) => selectPreviewRequest(s, dataView));
  const {
    setAdvancedEditorConfig,
    setAdvancedEditorConfigLastApplied,
    setAdvancedEditorSwitchModalVisible,
    toggleAdvancedEditor,
  } = useWizardActions();

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

              if (!isAdvancedPivotEditorEnabled) {
                const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
                setAdvancedEditorConfigLastApplied(stringifiedPivotConfig);
                setAdvancedEditorConfig(stringifiedPivotConfig);
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
