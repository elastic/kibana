/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConfigView } from './connector_configuration_config';
import { ConnectorConfigurationFormItems } from './connector_configuration_form_items';

interface ConnectorConfigurationForm {
  cancelEditing: () => void;
  configView: ConfigView;
  hasDocumentLevelSecurity: boolean;
  hasPlatinumLicense: boolean;
  isLoading: boolean;
  saveConfig: (configuration: Record<string, string | number | boolean | null>) => void;
}

function configViewToConfigValues(
  configView: ConfigView
): Record<string, string | number | boolean | null> {
  const result: Record<string, string | number | boolean | null> = {};
  for (const { key, value } of configView.advancedConfigurations) {
    result[key] = value;
  }
  for (const { key, value } of configView.unCategorizedItems) {
    result[key] = value;
  }
  return result;
}

export const ConnectorConfigurationForm: React.FC<ConnectorConfigurationForm> = ({
  cancelEditing,
  configView,
  hasDocumentLevelSecurity,
  hasPlatinumLicense,
  isLoading,
  saveConfig,
}) => {
  const [configValues, setConfigValues] = useState<
    Record<string, string | number | boolean | null>
  >({});
  useEffect(() => setConfigValues(configViewToConfigValues(configView)), [configView]);

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveConfig(configValues);
      }}
      component="form"
    >
      <ConnectorConfigurationFormItems
        hasPlatinumLicense={hasPlatinumLicense}
        isLoading={isLoading}
        items={configView.unCategorizedItems}
        hasDocumentLevelSecurityEnabled={hasDocumentLevelSecurity}
        setConfigEntry={(key, value) => setConfigValues({ ...configValues, [key]: value })}
      />
      {configView.categories.map((category, index) => (
        <React.Fragment key={index}>
          <EuiSpacer />
          <EuiTitle size="s">
            <h3>{category.label}</h3>
          </EuiTitle>
          <EuiSpacer />
          <ConnectorConfigurationFormItems
            hasPlatinumLicense={hasPlatinumLicense}
            isLoading={isLoading}
            items={category.configEntries}
            hasDocumentLevelSecurityEnabled={hasDocumentLevelSecurity}
            setConfigEntry={(key, value) => setConfigValues({ ...configValues, [key]: value })}
          />
        </React.Fragment>
      ))}
      {configView.advancedConfigurations.length > 0 && (
        <React.Fragment>
          <EuiSpacer />
          <EuiTitle size="xs">
            <h4>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.advancedConfigurations.title',
                { defaultMessage: 'Advanced Configurations' }
              )}
            </h4>
          </EuiTitle>
          <EuiPanel color="subdued">
            <ConnectorConfigurationFormItems
              hasPlatinumLicense={hasPlatinumLicense}
              isLoading={isLoading}
              items={configView.advancedConfigurations}
              hasDocumentLevelSecurityEnabled={hasDocumentLevelSecurity}
              setConfigEntry={(key, value) => setConfigValues({ ...configValues, [key]: value })}
            />
          </EuiPanel>
        </React.Fragment>
      )}
      <EuiSpacer />
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="entSearchContent-connector-configuration-saveConfiguration"
              data-telemetry-id="entSearchContent-connector-configuration-saveConfiguration"
              type="submit"
              isLoading={isLoading}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.submitButton.title',
                {
                  defaultMessage: 'Save configuration',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id="entSearchContent-connector-configuration-cancelEdit"
              isDisabled={isLoading}
              onClick={() => {
                cancelEditing();
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.cancelEditingButton.title',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
