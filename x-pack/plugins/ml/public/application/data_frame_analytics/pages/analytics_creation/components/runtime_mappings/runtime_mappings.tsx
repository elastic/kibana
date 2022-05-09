/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { XJsonMode } from '@kbn/ace';
import { XJson } from '@kbn/es-ui-shared-plugin/public';
import { useMlContext } from '../../../../../contexts/ml';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { getCombinedRuntimeMappings } from '../../../../../components/data_grid/common';
import { isPopulatedObject } from '../../../../../../../common/util/object_utils';
import { RuntimeMappingsEditor } from './runtime_mappings_editor';
import { isRuntimeMappings } from '../../../../../../../common';
import { SwitchModal } from './switch_modal';

const advancedEditorsSidebarWidth = '220px';
const COPY_RUNTIME_FIELDS_TO_CLIPBOARD_TEXT = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.indexPreview.copyRuntimeMappingsClipboardTooltip',
  {
    defaultMessage: 'Copy Dev Console statement of the runtime fields to the clipboard.',
  }
);

const APPLY_CHANGES_TEXT = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.advancedSourceEditorApplyButtonText',
  {
    defaultMessage: 'Apply changes',
  }
);

const RUNTIME_FIELDS_EDITOR_HELP_TEXT = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.advancedRuntimeFieldsEditorHelpText',
  {
    defaultMessage: 'The advanced editor allows you to edit the runtime fields of the source.',
  }
);

const EDIT_SWITCH_LABEL_TEXT = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.advancedEditorRuntimeFieldsSwitchLabel',
  {
    defaultMessage: 'Edit runtime fields',
  }
);

const RUNTIME_FIELDS_LABEL_TEXT = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.runtimeFieldsLabel',
  {
    defaultMessage: 'Runtime fields',
  }
);

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();
export type XJsonModeType = ReturnType<typeof XJsonMode>;

interface Props {
  actions: CreateAnalyticsFormProps['actions'];
  state: CreateAnalyticsFormProps['state'];
}

export const RuntimeMappings: FC<Props> = ({ actions, state }) => {
  const [isRuntimeMappingsEditorEnabled, setIsRuntimeMappingsEditorEnabled] =
    useState<boolean>(false);
  const [isRuntimeMappingsEditorSwitchModalVisible, setRuntimeMappingsEditorSwitchModalVisible] =
    useState<boolean>(false);

  const [isRuntimeMappingsEditorApplyButtonEnabled, setIsRuntimeMappingsEditorApplyButtonEnabled] =
    useState<boolean>(false);
  const [advancedEditorRuntimeMappingsLastApplied, setAdvancedEditorRuntimeMappingsLastApplied] =
    useState<string>();

  const { setFormState } = actions;
  const { jobType, previousRuntimeMapping, runtimeMappings } = state.form;

  const {
    convertToJson,
    setXJson: setAdvancedRuntimeMappingsConfig,
    xJson: advancedRuntimeMappingsConfig,
  } = useXJsonMode(runtimeMappings || '');

  const mlContext = useMlContext();
  const { currentDataView } = mlContext;

  const applyChanges = () => {
    const removeRuntimeMappings = advancedRuntimeMappingsConfig === '';
    const parsedRuntimeMappings = removeRuntimeMappings
      ? undefined
      : JSON.parse(advancedRuntimeMappingsConfig);
    const prettySourceConfig = removeRuntimeMappings
      ? ''
      : JSON.stringify(parsedRuntimeMappings, null, 2);
    const previous =
      previousRuntimeMapping === undefined && runtimeMappings === undefined
        ? parsedRuntimeMappings
        : runtimeMappings;
    setFormState({
      runtimeMappings: parsedRuntimeMappings,
      runtimeMappingsUpdated: true,
      previousRuntimeMapping: previous,
    });
    setAdvancedRuntimeMappingsConfig(prettySourceConfig);
    setAdvancedEditorRuntimeMappingsLastApplied(prettySourceConfig);
    setIsRuntimeMappingsEditorApplyButtonEnabled(false);
  };

  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setFormState({
        runtimeMappingsUpdated: false,
      });

      setAdvancedRuntimeMappingsConfig(advancedEditorRuntimeMappingsLastApplied ?? '');
    }

    setIsRuntimeMappingsEditorEnabled(!isRuntimeMappingsEditorEnabled);
    setIsRuntimeMappingsEditorApplyButtonEnabled(isRuntimeMappings(runtimeMappings));
  };

  useEffect(function getInitialRuntimeMappings() {
    const combinedRuntimeMappings = getCombinedRuntimeMappings(currentDataView, runtimeMappings);

    const prettySourceConfig = JSON.stringify(combinedRuntimeMappings, null, 2);

    if (combinedRuntimeMappings) {
      setAdvancedRuntimeMappingsConfig(prettySourceConfig);
      setAdvancedEditorRuntimeMappingsLastApplied(prettySourceConfig);
      setFormState({
        runtimeMappings: combinedRuntimeMappings,
      });
    }
  }, []);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFormRow fullWidth={true} label={RUNTIME_FIELDS_LABEL_TEXT}>
        <EuiFlexGroup alignItems="baseline" justifyContent="spaceBetween">
          <EuiFlexItem grow={true}>
            {isPopulatedObject(runtimeMappings) ? (
              <EuiText size="s" grow={false}>
                {Object.keys(runtimeMappings).join(',')}
              </EuiText>
            ) : (
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.createWizard.noRuntimeFieldLabel"
                defaultMessage="No runtime field"
              />
            )}

            {isRuntimeMappingsEditorEnabled && (
              <>
                <EuiSpacer size="s" />
                <RuntimeMappingsEditor
                  advancedEditorRuntimeMappingsLastApplied={
                    advancedEditorRuntimeMappingsLastApplied
                  }
                  advancedRuntimeMappingsConfig={advancedRuntimeMappingsConfig}
                  setIsRuntimeMappingsEditorApplyButtonEnabled={
                    setIsRuntimeMappingsEditorApplyButtonEnabled
                  }
                  setAdvancedRuntimeMappingsConfig={setAdvancedRuntimeMappingsConfig}
                  convertToJson={convertToJson}
                  xJsonMode={xJsonMode}
                />
              </>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false} style={{ width: advancedEditorsSidebarWidth }}>
            <EuiFlexGroup gutterSize="xs" direction="column" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      disabled={jobType === undefined}
                      label={EDIT_SWITCH_LABEL_TEXT}
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
                      data-test-subj="mlDataFrameAnalyticsRuntimeMappingsEditorSwitch"
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
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy
                      beforeMessage={COPY_RUNTIME_FIELDS_TO_CLIPBOARD_TEXT}
                      textToCopy={advancedRuntimeMappingsConfig ?? ''}
                    >
                      {(copy: () => void) => (
                        <EuiButtonIcon
                          onClick={copy}
                          iconType="copyClipboard"
                          aria-label={COPY_RUNTIME_FIELDS_TO_CLIPBOARD_TEXT}
                        />
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>

              {isRuntimeMappingsEditorEnabled && (
                <EuiFlexItem style={{ width: advancedEditorsSidebarWidth }}>
                  <EuiSpacer size="s" />
                  <EuiText size="xs">{RUNTIME_FIELDS_EDITOR_HELP_TEXT}</EuiText>
                  <EuiSpacer size="s" />
                  <EuiButton
                    style={{ width: 'fit-content' }}
                    size="s"
                    fill
                    onClick={applyChanges}
                    disabled={!isRuntimeMappingsEditorApplyButtonEnabled}
                    data-test-subj="mlDataFrameAnalyticsRuntimeMappingsApplyButton"
                  >
                    {APPLY_CHANGES_TEXT}
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
