/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  PivotAggDict,
  PivotAggsConfigDict,
  PivotGroupByDict,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PIVOT_SUPPORTED_AGGS,
} from '../../../../common';

import { SwitchModal } from '../switch_modal';

import { StepDefineFormHook } from '../step_define';

export const AdvancedPivotEditorSwitch: FC<StepDefineFormHook> = ({
  advancedPivotEditor: {
    actions: {
      convertToJson,
      setAdvancedEditorConfigLastApplied,
      setAdvancedEditorSwitchModalVisible,
      setAdvancedPivotEditorApplyButtonEnabled,
      toggleAdvancedEditor,
    },
    state: {
      advancedEditorConfig,
      advancedEditorConfigLastApplied,
      isAdvancedEditorSwitchModalVisible,
      isAdvancedPivotEditorEnabled,
      isAdvancedPivotEditorApplyButtonEnabled,
    },
  },
  pivotConfig: {
    actions: { setAggList, setGroupByList },
  },
}) => {
  const applyChangesHandler = () => {
    const pivot = JSON.parse(convertToJson(advancedEditorConfig));

    const newGroupByList: PivotGroupByConfigDict = {};
    if (pivot !== undefined && pivot.group_by !== undefined) {
      Object.entries(pivot.group_by).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotGroupByDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PivotSupportedGroupByAggs;
        newGroupByList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    setGroupByList(newGroupByList);

    const newAggList: PivotAggsConfigDict = {};
    if (pivot !== undefined && pivot.aggregations !== undefined) {
      Object.entries(pivot.aggregations).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotAggDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PIVOT_SUPPORTED_AGGS;
        newAggList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    setAggList(newAggList);

    setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    setAdvancedPivotEditorApplyButtonEnabled(false);
  };

  return (
    <EuiFormRow>
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate('xpack.transform.stepDefineForm.advancedEditorSwitchLabel', {
              defaultMessage: 'Advanced pivot editor',
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
        {isAdvancedPivotEditorEnabled && (
          <EuiButton
            size="s"
            fill
            onClick={applyChangesHandler}
            disabled={!isAdvancedPivotEditorApplyButtonEnabled}
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
