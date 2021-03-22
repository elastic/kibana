/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { StepDefineFormHook } from '../step_define';
import { AdvancedRuntimeMappingsEditor } from '../advanced_runtime_mappings_editor/advanced_runtime_mappings_editor';
import { AdvancedRuntimeMappingsEditorSwitch } from '../advanced_runtime_mappings_editor_switch';
import {
  isPivotGroupByConfigWithUiSupport,
  PivotAggsConfigWithUiSupport,
} from '../../../../common';
import { isPivotAggConfigWithUiSupport } from '../../../../common/pivot_group_by';

const advancedEditorsSidebarWidth = '220px';
const COPY_TO_CLIPBOARD_RUNTIME_MAPPINGS = i18n.translate(
  'xpack.transform.indexPreview.copyRuntimeMappingsClipboardTooltip',
  {
    defaultMessage: 'Copy Dev Console statement of the runtime mappings to the clipboard.',
  }
);

export const AdvancedRuntimeMappingsSettings: FC<StepDefineFormHook> = (props) => {
  const {
    actions: { applyRuntimeMappingsEditorChanges },
    state: {
      runtimeMappings,
      advancedRuntimeMappingsConfig,
      isRuntimeMappingsEditorApplyButtonEnabled,
      isRuntimeMappingsEditorEnabled,
    },
  } = props.runtimeMappingsEditor;
  const {
    actions: { deleteAggregation, deleteGroupBy },
    state: { groupByList, aggList },
  } = props.pivotConfig;

  const applyChanges = () => {
    const nextConfig = JSON.parse(advancedRuntimeMappingsConfig);
    const previousConfig = runtimeMappings;

    applyRuntimeMappingsEditorChanges();

    // If the user updates the name of the runtime mapping fields
    // delete any groupBy or aggregation associated with the deleted field
    Object.keys(groupByList).forEach((groupByKey) => {
      const groupBy = groupByList[groupByKey];
      if (
        isPivotGroupByConfigWithUiSupport(groupBy) &&
        previousConfig?.hasOwnProperty(groupBy.field) &&
        !nextConfig.hasOwnProperty(groupBy.field)
      ) {
        deleteGroupBy(groupByKey);
      }
    });
    Object.keys(aggList).forEach((aggName) => {
      const agg = aggList[aggName] as PivotAggsConfigWithUiSupport;
      if (
        isPivotAggConfigWithUiSupport(agg) &&
        agg.field !== undefined &&
        previousConfig?.hasOwnProperty(agg.field) &&
        !nextConfig.hasOwnProperty(agg.field)
      ) {
        deleteAggregation(aggName);
      }
    });
  };
  return (
    <>
      <EuiSpacer size="s" />

      <EuiFormRow
        fullWidth={true}
        label={i18n.translate('xpack.transform.stepDefineForm.runtimeMappingsLabel', {
          defaultMessage: 'Runtime mappings',
        })}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={true}>
            {runtimeMappings !== undefined && Object.keys(runtimeMappings).length > 0 ? (
              <FormattedMessage
                id="xpack.transform.stepDefineForm.runtimeMappingsListLabel"
                defaultMessage="{runtimeFields}"
                values={{
                  runtimeFields: Object.keys(runtimeMappings).join(','),
                }}
              />
            ) : (
              <FormattedMessage
                id="xpack.transform.stepDefineForm.noRuntimeMappingsLabel"
                defaultMessage="No runtime mapping"
              />
            )}

            {isRuntimeMappingsEditorEnabled && (
              <>
                <EuiSpacer size="s" />
                <AdvancedRuntimeMappingsEditor {...props.runtimeMappingsEditor} />
              </>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
            <EuiFlexGroup gutterSize="xs" direction="column" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <AdvancedRuntimeMappingsEditorSwitch {...props.runtimeMappingsEditor} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy beforeMessage={COPY_TO_CLIPBOARD_RUNTIME_MAPPINGS} textToCopy={''}>
                      {(copy: () => void) => (
                        <EuiButtonIcon
                          onClick={copy}
                          iconType="copyClipboard"
                          aria-label={COPY_TO_CLIPBOARD_RUNTIME_MAPPINGS}
                        />
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {isRuntimeMappingsEditorEnabled && (
                <EuiFlexItem style={{ width: advancedEditorsSidebarWidth }}>
                  <EuiSpacer size="s" />
                  <EuiText size="xs">
                    {i18n.translate(
                      'xpack.transform.stepDefineForm.advancedRuntimeMappingsEditorHelpText',
                      {
                        defaultMessage:
                          'The advanced editor allows you to edit the runtime mappings of the transform configuration.',
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="s" />
                  <EuiButton
                    style={{ width: 'fit-content' }}
                    size="s"
                    fill
                    onClick={applyChanges}
                    disabled={!isRuntimeMappingsEditorApplyButtonEnabled}
                    data-test-subj="transformRuntimeMappingsApplyButton"
                  >
                    {i18n.translate(
                      'xpack.transform.stepDefineForm.advancedSourceEditorApplyButtonText',
                      {
                        defaultMessage: 'Apply changes',
                      }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      <EuiSpacer size="s" />
    </>
  );
};
