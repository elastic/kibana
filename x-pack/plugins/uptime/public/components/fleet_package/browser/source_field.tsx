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
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiFormRow,
  EuiFieldText,
  EuiFieldPassword,
  EuiSpacer,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { usePolicyConfigContext } from '../contexts';
import { OptionalLabel } from '../optional_label';
import { CodeEditor } from '../code_editor';
import { ScriptRecorderFields } from './script_recorder_fields';
import { ZipUrlTLSFields } from './zip_url_tls_fields';
import { ConfigKey, MonacoEditorLangId } from '../types';

enum SourceType {
  INLINE = 'syntheticsBrowserInlineConfig',
  SCRIPT_RECORDER = 'syntheticsBrowserScriptRecorderConfig',
  ZIP = 'syntheticsBrowserZipURLConfig',
}

interface SourceConfig {
  zipUrl: string;
  proxyUrl: string;
  folder: string;
  username: string;
  password: string;
  inlineScript: string;
  params: string;
  isGeneratedScript?: boolean;
  fileName?: string;
}

interface Props {
  onChange: (sourceConfig: SourceConfig) => void;
  onFieldBlur: (field: ConfigKey) => void;
  defaultConfig?: SourceConfig;
}

export const defaultValues = {
  zipUrl: '',
  proxyUrl: '',
  folder: '',
  username: '',
  password: '',
  inlineScript: '',
  params: '',
  isGeneratedScript: false,
  fileName: '',
};

const getDefaultTab = (defaultConfig: SourceConfig, isZipUrlSourceEnabled = true) => {
  if (defaultConfig.inlineScript && defaultConfig.isGeneratedScript) {
    return SourceType.SCRIPT_RECORDER;
  } else if (defaultConfig.inlineScript) {
    return SourceType.INLINE;
  }

  return isZipUrlSourceEnabled ? SourceType.ZIP : SourceType.INLINE;
};

export const SourceField = ({ onChange, onFieldBlur, defaultConfig = defaultValues }: Props) => {
  const { isZipUrlSourceEnabled } = usePolicyConfigContext();
  const [sourceType, setSourceType] = useState<SourceType>(
    getDefaultTab(defaultConfig, isZipUrlSourceEnabled)
  );
  const [config, setConfig] = useState<SourceConfig>(defaultConfig);

  useEffect(() => {
    onChange(config);
  }, [config, onChange]);

  const zipUrlLabel = (
    <FormattedMessage
      id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.label"
      defaultMessage="Zip URL"
    />
  );

  const zipUrlSourceTabId = 'syntheticsBrowserZipURLConfig';
  const allTabs = [
    {
      id: zipUrlSourceTabId,
      name: zipUrlLabel,
      'data-test-subj': `syntheticsSourceTab__zipUrl`,
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={zipUrlLabel}
            isInvalid={!config.zipUrl}
            error={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.error"
                defaultMessage="Zip URL is required"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrl.helpText"
                defaultMessage="Location of the synthetics project repository zip file."
              />
            }
          >
            <EuiFieldText
              onChange={({ target: { value } }) =>
                setConfig((prevConfig) => ({ ...prevConfig, zipUrl: value }))
              }
              onBlur={() => onFieldBlur(ConfigKey.SOURCE_ZIP_URL)}
              value={config.zipUrl}
              data-test-subj="syntheticsBrowserZipUrl"
            />
          </EuiFormRow>
          <ZipUrlTLSFields />
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.brower.proxyURL.label"
                defaultMessage="Proxy Zip URL"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.http.helpText"
                defaultMessage="HTTP proxy for Zip URL."
              />
            }
          >
            <EuiFieldText
              onChange={({ target: { value } }) =>
                setConfig((prevConfig) => ({ ...prevConfig, proxyUrl: value }))
              }
              onBlur={() => onFieldBlur(ConfigKey.SOURCE_ZIP_PROXY_URL)}
              value={config.proxyUrl}
              data-test-subj="syntheticsBrowserZipUrlProxy"
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrlFolder.label"
                defaultMessage="Folder"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrlFolder.helpText"
                defaultMessage="Relative directory path where the synthetic journey files are located in the repository."
              />
            }
          >
            <EuiFieldText
              onChange={({ target: { value } }) =>
                setConfig((prevConfig) => ({ ...prevConfig, folder: value }))
              }
              onBlur={() => onFieldBlur(ConfigKey.SOURCE_ZIP_FOLDER)}
              value={config.folder}
              data-test-subj="syntheticsBrowserZipUrlFolder"
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.params.label"
                defaultMessage="Params"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.params.helpText"
                defaultMessage="A JSON object that defines any variables your tests require."
              />
            }
          >
            <CodeEditor
              ariaLabel={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.requestBody.codeEditor.json.ariaLabel',
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
              data-test-subj="syntheticsBrowserZipUrlParams"
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrlUsername.label"
                defaultMessage="Zip URL Username"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrlUsername.helpText"
                defaultMessage="The username for authenticating with the zip endpoint."
              />
            }
          >
            <EuiFieldText
              onChange={({ target: { value } }) =>
                setConfig((prevConfig) => ({ ...prevConfig, username: value }))
              }
              onBlur={() => onFieldBlur(ConfigKey.SOURCE_ZIP_USERNAME)}
              value={config.username}
              data-test-subj="syntheticsBrowserZipUrlUsername"
            />
          </EuiFormRow>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrlPassword.abel"
                defaultMessage="Zip URL Password"
              />
            }
            labelAppend={<OptionalLabel />}
            helpText={
              <FormattedMessage
                id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.zipUrlPassword.helpText"
                defaultMessage="The password for authenticating with the zip endpoint."
              />
            }
          >
            <EuiFieldPassword
              onChange={({ target: { value } }) =>
                setConfig((prevConfig) => ({ ...prevConfig, password: value }))
              }
              onBlur={() => onFieldBlur(ConfigKey.SOURCE_ZIP_PASSWORD)}
              value={config.password}
              data-test-subj="syntheticsBrowserZipUrlPassword"
            />
          </EuiFormRow>
        </>
      ),
    },
    {
      id: 'syntheticsBrowserInlineConfig',
      name: (
        <FormattedMessage
          id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.label"
          defaultMessage="Inline script"
        />
      ),
      'data-test-subj': `syntheticsSourceTab__inline`,
      content: (
        <EuiFormRow
          isInvalid={!config.inlineScript}
          error={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.error"
              defaultMessage="Script is required"
            />
          }
          helpText={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.monitorIntegrationSettingsSection.browser.inlineScript.helpText"
              defaultMessage="Runs Synthetic test scripts that are defined inline."
            />
          }
        >
          <CodeEditor
            ariaLabel={i18n.translate(
              'xpack.uptime.createPackagePolicy.stepConfigure.requestBody.codeEditor.javascript.ariaLabel',
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
      ),
    },
    {
      id: 'syntheticsBrowserScriptRecorderConfig',
      name: (
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.browser.scriptRecorder.label"
              defaultMessage="Script recorder"
            />
          </EuiFlexItem>
          <StyledBetaBadgeWrapper grow={false}>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.browser.scriptRecorder.experimentalLabel',
                {
                  defaultMessage: 'Tech preview',
                }
              )}
              iconType="beaker"
              tooltipContent={i18n.translate(
                'xpack.uptime.createPackagePolicy.stepConfigure.browser.scriptRecorder.experimentalTooltip',
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
      ),
    },
  ];

  const tabs = isZipUrlSourceEnabled
    ? allTabs
    : allTabs.filter((tab: EuiTabbedContentTab) => tab.id !== zipUrlSourceTabId);

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
