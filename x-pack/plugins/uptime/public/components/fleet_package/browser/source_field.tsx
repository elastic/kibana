/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import {
  EuiTabbedContent,
  EuiFormRow,
  EuiFieldText,
  EuiFieldPassword,
  EuiSpacer,
} from '@elastic/eui';
import { OptionalLabel } from '../optional_label';
import { CodeEditor } from '../code_editor';
import { MonacoEditorLangId } from '../types';

enum SourceType {
  INLINE = 'syntheticsBrowserInlineConfig',
  ZIP = 'syntheticsBrowserZipURLConfig',
}

interface SourceConfig {
  zipUrl: string;
  folder: string;
  username: string;
  password: string;
  inlineScript: string;
  params: string;
}

interface Props {
  onChange: (sourceConfig: SourceConfig) => void;
  defaultConfig: SourceConfig;
}

const defaultValues = {
  zipUrl: '',
  folder: '',
  username: '',
  password: '',
  inlineScript: '',
  params: '',
};

export const SourceField = ({ onChange, defaultConfig = defaultValues }: Props) => {
  const [sourceType, setSourceType] = useState<SourceType>(
    defaultConfig.inlineScript ? SourceType.INLINE : SourceType.ZIP
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

  const tabs = [
    {
      id: 'syntheticsBrowserZipURLConfig',
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
              value={config.zipUrl}
              data-test-subj="syntheticsBrowserZipUrl"
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
              onChange={(code) => setConfig((prevConfig) => ({ ...prevConfig, params: code }))}
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
            onChange={(code) => setConfig((prevConfig) => ({ ...prevConfig, inlineScript: code }))}
            value={config.inlineScript}
          />
        </EuiFormRow>
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs.find((tab) => tab.id === sourceType)}
      autoFocus="selected"
      onTabClick={(tab) => {
        setSourceType(tab.id as SourceType);
        if (tab.id !== sourceType) {
          setConfig(defaultValues);
        }
      }}
    />
  );
};
