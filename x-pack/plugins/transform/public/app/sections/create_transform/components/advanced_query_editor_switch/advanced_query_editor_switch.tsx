/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SwitchModal } from '../switch_modal';
import { defaultSearch } from '../step_define';

import { StepDefineFormHook } from '../step_define';

export const AdvancedQueryEditorSwitch: FC<StepDefineFormHook> = ({
  advancedSourceEditor: {
    actions: {
      applyAdvancedSourceEditorChanges,
      setAdvancedSourceEditorSwitchModalVisible,
      setSourceConfigUpdated,
      toggleAdvancedSourceEditor,
    },
    state: {
      advancedEditorSourceConfig,
      isAdvancedSourceEditorEnabled,
      isAdvancedSourceEditorApplyButtonEnabled,
      isAdvancedSourceEditorSwitchModalVisible,
      sourceConfigUpdated,
    },
  },
  searchBar: {
    actions: { setSearchQuery },
  },
}) => {
  const applyChangesHandler = () => {
    const sourceConfig = JSON.parse(advancedEditorSourceConfig);
    setSearchQuery(sourceConfig);
    applyAdvancedSourceEditorChanges();
  };

  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setSearchQuery(defaultSearch);
      setSourceConfigUpdated(false);
    }
    toggleAdvancedSourceEditor(reset);
  };

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
            checked={isAdvancedSourceEditorEnabled}
            onChange={() => {
              if (isAdvancedSourceEditorEnabled && sourceConfigUpdated) {
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
        </EuiFlexItem>
        {isAdvancedSourceEditorEnabled && (
          <EuiButton
            size="s"
            fill
            onClick={applyChangesHandler}
            disabled={!isAdvancedSourceEditorApplyButtonEnabled}
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
