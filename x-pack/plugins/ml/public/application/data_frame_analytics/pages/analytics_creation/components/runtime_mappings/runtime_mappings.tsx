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
import { FormattedMessage } from '@kbn/i18n/react';
import { XJsonMode } from '@kbn/ace';
import { RuntimeField } from '../../../../../../../../../../src/plugins/data/common/index_patterns';
import { useMlContext } from '../../../../../contexts/ml';
import { CreateAnalyticsFormProps } from '../../../analytics_management/hooks/use_create_analytics_form';
import { XJson } from '../../../../../../../../../../src/plugins/es_ui_shared/public';
import { getCombinedRuntimeMappings } from '../../../../../components/data_grid/common';
import { isPopulatedObject } from '../../../../../../../common/util/object_utils';
import { RuntimeMappingsEditor } from './runtime_mappings_editor';

const advancedEditorsSidebarWidth = '220px';
const COPY_TO_CLIPBOARD_RUNTIME_MAPPINGS = i18n.translate(
  'xpack.ml.dataframe.analytics.createWizard.indexPreview.copyRuntimeMappingsClipboardTooltip',
  {
    defaultMessage: 'Copy Dev Console statement of the runtime mappings to the clipboard.',
  }
);

const { useXJsonMode } = XJson;
const xJsonMode = new XJsonMode();

interface Props {
  actions: CreateAnalyticsFormProps['actions'];
  state: CreateAnalyticsFormProps['state'];
}

type RuntimeMappings = Record<string, RuntimeField>;

export const RuntimeMappings: FC<Props> = ({ actions, state }) => {
  const [isRuntimeMappingsEditorEnabled, setIsRuntimeMappingsEditorEnabled] = useState<boolean>(
    false
  );
  const [
    isRuntimeMappingsEditorApplyButtonEnabled,
    setIsRuntimeMappingsEditorApplyButtonEnabled,
  ] = useState<boolean>(false);
  const [
    advancedEditorRuntimeMappingsLastApplied,
    setAdvancedEditorRuntimeMappingsLastApplied,
  ] = useState<string>();
  const [advancedEditorRuntimeMappings, setAdvancedEditorRuntimeMappings] = useState<string>();

  const { setFormState } = actions;
  const { jobType, previousRuntimeMapping, runtimeMappings } = state.form;

  const {
    convertToJson,
    setXJson: setAdvancedRuntimeMappingsConfig,
    xJson: advancedRuntimeMappingsConfig,
  } = useXJsonMode(runtimeMappings || '');

  const mlContext = useMlContext();
  const { currentIndexPattern } = mlContext;

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
    setAdvancedEditorRuntimeMappings(prettySourceConfig);
    setAdvancedEditorRuntimeMappingsLastApplied(prettySourceConfig);
    setIsRuntimeMappingsEditorApplyButtonEnabled(false);
  };

  // If switching to KQL after updating via editor - reset search
  const toggleEditorHandler = (reset = false) => {
    if (reset === true) {
      setFormState({ runtimeMappingsUpdated: false });
    }
    if (isRuntimeMappingsEditorEnabled === false) {
      setAdvancedEditorRuntimeMappingsLastApplied(advancedEditorRuntimeMappings);
    }

    setIsRuntimeMappingsEditorEnabled(!isRuntimeMappingsEditorEnabled);
    setIsRuntimeMappingsEditorApplyButtonEnabled(false);
  };

  useEffect(function getInitialRuntimeMappings() {
    const combinedRuntimeMappings = getCombinedRuntimeMappings(
      currentIndexPattern,
      runtimeMappings
    );

    if (combinedRuntimeMappings) {
      setAdvancedRuntimeMappingsConfig(JSON.stringify(combinedRuntimeMappings, null, 2));
      setFormState({
        runtimeMappings: combinedRuntimeMappings,
      });
    }
  }, []);

  return (
    <>
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth={true}
        label={i18n.translate('xpack.ml.dataframe.analytics.createWizard.runtimeMappingsLabel', {
          defaultMessage: 'Runtime mappings',
        })}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={true}>
            {isPopulatedObject(runtimeMappings) ? (
              <EuiText size="s" grow={false}>
                {Object.keys(runtimeMappings).join(',')}
              </EuiText>
            ) : (
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.createWizard.noRuntimeMappingsLabel"
                defaultMessage="No runtime mapping"
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
                      label={i18n.translate(
                        'xpack.ml.dataframe.analytics.createWizard.advancedEditorRuntimeMappingsSwitchLabel',
                        {
                          defaultMessage: 'Edit runtime mappings',
                        }
                      )}
                      checked={isRuntimeMappingsEditorEnabled}
                      onChange={() => toggleEditorHandler()}
                      data-test-subj="mlDataFrameAnalyticsRuntimeMappingsEditorSwitch"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy
                      beforeMessage={COPY_TO_CLIPBOARD_RUNTIME_MAPPINGS}
                      textToCopy={advancedRuntimeMappingsConfig ?? ''}
                    >
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
                      'xpack.ml.dataframe.analytics.createWizard.advancedRuntimeMappingsEditorHelpText',
                      {
                        defaultMessage:
                          'The advanced editor allows you to edit the runtime mappings of the source.',
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
                    data-test-subj="mlDataFrameAnalyticsRuntimeMappingsApplyButton"
                  >
                    {i18n.translate(
                      'xpack.ml.dataframe.analytics.createWizard.advancedSourceEditorApplyButtonText',
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
