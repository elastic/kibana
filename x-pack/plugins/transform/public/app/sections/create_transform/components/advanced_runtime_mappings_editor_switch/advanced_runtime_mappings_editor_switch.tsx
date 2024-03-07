/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWizardSelector, useWizardActions } from '../../state_management/create_transform_store';
import { SwitchModal } from './switch_modal';

export const AdvancedRuntimeMappingsEditorSwitch: FC = () => {
  const isRuntimeMappingsEditorEnabled = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.isRuntimeMappingsEditorEnabled
  );
  const isRuntimeMappingsEditorSwitchModalVisible = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.isRuntimeMappingsEditorSwitchModalVisible
  );
  const advancedEditorRuntimeMappingsLastApplied = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.advancedRuntimeMappingsConfigLastApplied
  );
  const advancedRuntimeMappingsConfig = useWizardSelector(
    (s) => s.advancedRuntimeMappingsEditor.advancedRuntimeMappingsConfig
  );
  const { setRuntimeMappingsEditorSwitchModalVisible, toggleRuntimeMappingsEditor } =
    useWizardActions();

  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    toggleRuntimeMappingsEditor(reset);
  };

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.transform.stepDefineForm.advancedEditorRuntimeFieldsSwitchLabel',
          {
            defaultMessage: 'Edit runtime fields',
          }
        )}
        checked={isRuntimeMappingsEditorEnabled}
        onChange={() => {
          if (
            isRuntimeMappingsEditorEnabled &&
            advancedRuntimeMappingsConfig !== advancedEditorRuntimeMappingsLastApplied
          ) {
            setRuntimeMappingsEditorSwitchModalVisible(true);
            return;
          }

          toggleEditorHandler();
        }}
        data-test-subj="transformAdvancedRuntimeMappingsEditorSwitch"
      />
      {isRuntimeMappingsEditorSwitchModalVisible && (
        <SwitchModal
          onCancel={() => setRuntimeMappingsEditorSwitchModalVisible(false)}
          onConfirm={() => {
            setRuntimeMappingsEditorSwitchModalVisible(false);
            toggleEditorHandler(true);
          }}
        />
      )}
    </>
  );
};
