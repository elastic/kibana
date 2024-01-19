/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useWizardActions, useWizardSelector } from '../state_management/create_transform_store';

import { SwitchModal } from './switch_modal';
import { defaultSearch } from './step_define';

export const AdvancedQueryEditorSwitch: FC = () => {
  const isAdvancedSourceEditorEnabled = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorEnabled
  );
  const isAdvancedSourceEditorSwitchModalVisible = useWizardSelector(
    (s) => s.advancedSourceEditor.isAdvancedSourceEditorSwitchModalVisible
  );
  const sourceConfigUpdated = useWizardSelector((s) => s.advancedSourceEditor.sourceConfigUpdated);
  const advancedSourceEditorConfigLastApplied = useWizardSelector(
    (s) => s.advancedSourceEditor.advancedSourceEditorConfigLastApplied
  );
  const advancedSourceEditorConfig = useWizardSelector(
    (s) => s.advancedSourceEditor.advancedSourceEditorConfig
  );
  const {
    setAdvancedSourceEditorSwitchModalVisible,
    setSearchQuery,
    setSourceConfigUpdated,
    toggleAdvancedSourceEditor,
  } = useWizardActions();

  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setSearchQuery(defaultSearch);
      setSourceConfigUpdated(false);
    }
    toggleAdvancedSourceEditor(reset);
  };

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'xpack.transform.stepDefineForm.advancedEditorSourceConfigSwitchLabel',
          {
            defaultMessage: 'Edit JSON query',
          }
        )}
        checked={isAdvancedSourceEditorEnabled}
        onChange={() => {
          if (
            isAdvancedSourceEditorEnabled &&
            (sourceConfigUpdated ||
              advancedSourceEditorConfig !== advancedSourceEditorConfigLastApplied)
          ) {
            setAdvancedSourceEditorSwitchModalVisible(true);
            return;
          }

          toggleEditorHandler();
        }}
        data-test-subj="transformAdvancedQueryEditorSwitch"
      />
      {isAdvancedSourceEditorSwitchModalVisible && (
        <SwitchModal
          onCancel={() => setAdvancedSourceEditorSwitchModalVisible(false)}
          onConfirm={() => {
            setAdvancedSourceEditorSwitchModalVisible(false);
            toggleEditorHandler(true);
          }}
          type={'source'}
        />
      )}
    </>
  );
};
