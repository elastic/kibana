/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiCode,
  EuiTabbedContent,
  EuiFormRow,
  EuiSpacer,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { OptionalLabel } from '../optional_label';
import { CodeEditor } from '../code_editor';
import { ScriptRecorderFields } from './script_recorder_fields';
import { ConfigKey, MonacoEditorLangId, Validation } from '../types';

enum SourceType {
  INLINE = 'syntheticsBrowserInlineConfig',
  SCRIPT_RECORDER = 'syntheticsBrowserScriptRecorderConfig',
}

interface SourceConfig {
  inlineScript: string;
  params: string;
  isGeneratedScript?: boolean;
  fileName?: string;
}

export interface Props {
  onChange: (sourceConfig: SourceConfig) => void;
  onFieldBlur: (field: ConfigKey) => void;
  defaultConfig?: SourceConfig;
  validate?: Validation;
}

export const defaultValues = {
  inlineScript: '',
  params: '',
  isGeneratedScript: false,
  fileName: '',
};

const getDefaultTab = (defaultConfig: SourceConfig) => {
  if (defaultConfig.inlineScript && defaultConfig.isGeneratedScript) {
    return SourceType.SCRIPT_RECORDER;
  } else {
    return SourceType.INLINE;
  }
};

export const SourceField = ({
  onChange,
  onFieldBlur,
  defaultConfig = defaultValues,
  validate,
}: Props) => {
  const [sourceType, setSourceType] = useState<SourceType>(getDefaultTab(defaultConfig));
  const [config, setConfig] = useState<SourceConfig>(defaultConfig);

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const isSourceInlineInvalid =
    validate?.[ConfigKey.SOURCE_INLINE]?.({
      [ConfigKey.SOURCE_INLINE]: config.inlineScript,
    }) ?? false;

  const params = (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.params.label"
          defaultMessage="Parameters"
        />
      }
      labelAppend={<OptionalLabel />}
      helpText={
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.params.helpText"
          defaultMessage="Use JSON to define parameters that can be referenced in your script with {code}"
          values={{ code: <EuiCode>params.value</EuiCode> }}
        />
      }
    >
      <CodeEditor
        ariaLabel={i18n.translate(
          'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.json.ariaLabel',
          {
            defaultMessage: 'JSON code editor',
          }
        )}
        id="jsonParamsEditor"
        languageId={MonacoEditorLangId.JSON}
        onChange={(code) => {
          setConfig((prevConfig) => ({ ...prevConfig, params: code }));
          onFieldBlur(ConfigKey.PARAMS);
        }}
        value={config.params}
        data-test-subj="syntheticsBrowserParams"
      />
    </EuiFormRow>
  );

  const tabs = [
    {
      id: 'syntheticsBrowserInlineConfig',
      name: (
        <FormattedMessage
          id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.label"
          defaultMessage="Inline script"
        />
      ),
      'data-test-subj': `syntheticsSourceTab__inline`,
      content: (
        <>
          <EuiFormRow
            isInvalid={isSourceInlineInvalid}
            error={
              <FormattedMessage
                id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.error"
                defaultMessage="Script is required"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.synthetics.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.helpText"
                defaultMessage="Runs Synthetic test scripts that are defined inline."
              />
            }
          >
            <CodeEditor
              ariaLabel={i18n.translate(
                'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.javascript.ariaLabel',
                {
                  defaultMessage: 'JavaScript code editor',
                }
              )}
              id="javascript"
              languageId={MonacoEditorLangId.JAVASCRIPT}
              onChange={(code) => {
                setConfig((prevConfig) => ({ ...prevConfig, inlineScript: code }));
                onFieldBlur(ConfigKey.SOURCE_INLINE);
              }}
              value={config.inlineScript}
            />
          </EuiFormRow>
          {params}
        </>
      ),
    },
    {
      id: 'syntheticsBrowserScriptRecorderConfig',
      name: (
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.synthetics.createPackagePolicy.stepConfigure.browser.scriptRecorder.label"
              defaultMessage="Script recorder"
            />
          </EuiFlexItem>
          <StyledBetaBadgeWrapper grow={false}>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.synthetics.createPackagePolicy.stepConfigure.browser.scriptRecorder.experimentalLabel',
                {
                  defaultMessage: 'Tech preview',
                }
              )}
              iconType="beaker"
              tooltipContent={i18n.translate(
                'xpack.synthetics.createPackagePolicy.stepConfigure.browser.scriptRecorder.experimentalTooltip',
                {
                  defaultMessage:
                    'Preview the quickest way to create Elastic Synthetics monitoring scripts with our Elastic Synthetics Recorder',
                }
              )}
            />
          </StyledBetaBadgeWrapper>
        </EuiFlexGroup>
      ),
      'data-test-subj': 'syntheticsSourceTab__scriptRecorder',
      content: (
        <>
          <ScriptRecorderFields
            onChange={({ scriptText, fileName }) =>
              setConfig((prevConfig) => ({
                ...prevConfig,
                inlineScript: scriptText,
                isGeneratedScript: true,
                fileName,
              }))
            }
            script={config.inlineScript}
            fileName={config.fileName}
          />
          <EuiSpacer size="s" />
          {params}
        </>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs.find((tab) => tab.id === sourceType)}
      autoFocus="selected"
      onTabClick={(tab) => {
        if (tab.id !== sourceType) {
          setConfig(defaultValues);
        }
        setSourceType(tab.id as SourceType);
      }}
    />
  );
};

const StyledBetaBadgeWrapper = styled(EuiFlexItem)`
  .euiToolTipAnchor {
    display: flex;
  }
`;
