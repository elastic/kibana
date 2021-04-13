/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SwitchModal } from './switch_modal';
import { useAdvancedRuntimeMappingsEditor } from '../step_define/hooks/use_advanced_runtime_mappings_editor';

interface Props extends ReturnType<typeof useAdvancedRuntimeMappingsEditor> {
  applyChanges: () => void;
}
export const AdvancedRuntimeMappingsEditorSwitch: FC<Props> = (props) => {
  const {
    actions: {
      setRuntimeMappingsUpdated,
      toggleRuntimeMappingsEditor,
      setRuntimeMappingsEditorSwitchModalVisible,
    },
    state: {
      isRuntimeMappingsEditorEnabled,
      isRuntimeMappingsEditorSwitchModalVisible,
      runtimeMappingsUpdated,
    },

    applyChanges,
  } = props;

  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setRuntimeMappingsUpdated(false);
    }
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
          if (isRuntimeMappingsEditorEnabled && runtimeMappingsUpdated) {
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
            applyChanges();
            toggleEditorHandler();
          }}
        />
      )}
    </>
  );
};
