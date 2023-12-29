/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { XJson } from '@kbn/es-ui-shared-plugin/public';

import type {
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
} from '../../../../common';
import type { PivotAggDict } from '../../../../../../common/types/pivot_aggs';
import type { PivotGroupByDict } from '../../../../../../common/types/pivot_group_by';

import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { getAggConfigFromEsAgg } from '../../../../common/pivot_aggs';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

import { AdvancedPivotEditor } from '../advanced_pivot_editor';
import { AdvancedPivotEditorSwitch } from '../advanced_pivot_editor_switch';
import { PivotConfiguration } from '../pivot_configuration';

const { collapseLiteralStrings } = XJson;

const advancedEditorsSidebarWidth = '220px';

interface PivotFunctionFormProps {
  copyToClipboardPivot: string;
  copyToClipboardPivotDescription: string;
}

export const PivotFunctionForm: FC<PivotFunctionFormProps> = ({
  copyToClipboardPivot,
  copyToClipboardPivotDescription,
}) => {
  const { esTransformPivot } = useDocumentationLinks();

  const advancedEditorConfig = useWizardSelector((s) => s.advancedPivotEditor.advancedEditorConfig);
  const isAdvancedPivotEditorEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorEnabled
  );
  const isAdvancedPivotEditorApplyButtonEnabled = useWizardSelector(
    (s) => s.advancedPivotEditor.isAdvancedPivotEditorApplyButtonEnabled
  );
  const {
    setAdvancedPivotEditorApplyButtonEnabled,
    setAdvancedEditorConfigLastApplied,
    setAggList,
    setGroupByList,
  } = useWizardActions();

  const applyPivotChangesHandler = () => {
    const pivot = JSON.parse(collapseLiteralStrings(advancedEditorConfig));

    const newGroupByList: PivotGroupByConfigDict = {};
    if (pivot !== undefined && pivot.group_by !== undefined) {
      Object.entries(pivot.group_by).forEach((d) => {
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
      Object.entries(pivot.aggregations).forEach((d) => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotAggDict;

        newAggList[aggName] = getAggConfigFromEsAgg(aggConfig, aggName) as PivotAggsConfig;
      });
    }
    setAggList(newAggList);

    setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    setAdvancedPivotEditorApplyButtonEnabled(false);
  };

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      {/* Flex Column #1: Pivot Config Form / Advanced Pivot Config Editor */}
      <EuiFlexItem>
        {!isAdvancedPivotEditorEnabled && <PivotConfiguration />}
        {isAdvancedPivotEditorEnabled && <AdvancedPivotEditor />}
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
        <EuiFlexGroup gutterSize="xs" direction="column" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <AdvancedPivotEditorSwitch />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiCopy
                    beforeMessage={copyToClipboardPivotDescription}
                    textToCopy={copyToClipboardPivot}
                  >
                    {(copy: () => void) => (
                      <EuiButtonIcon
                        onClick={copy}
                        iconType="copyClipboard"
                        aria-label={copyToClipboardPivotDescription}
                      />
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
          {isAdvancedPivotEditorEnabled && (
            <EuiFlexItem style={{ width: advancedEditorsSidebarWidth }}>
              <EuiSpacer size="s" />
              <EuiText size="xs">
                <>
                  {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpText', {
                    defaultMessage:
                      'The advanced editor allows you to edit the pivot configuration of the transform.',
                  })}{' '}
                  <EuiLink href={esTransformPivot} target="_blank">
                    {i18n.translate('xpack.transform.stepDefineForm.advancedEditorHelpTextLink', {
                      defaultMessage: 'Learn more about available options.',
                    })}
                  </EuiLink>
                </>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiButton
                style={{ width: 'fit-content' }}
                size="s"
                fill
                onClick={applyPivotChangesHandler}
                disabled={!isAdvancedPivotEditorApplyButtonEnabled}
              >
                {i18n.translate('xpack.transform.stepDefineForm.advancedEditorApplyButtonText', {
                  defaultMessage: 'Apply changes',
                })}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
