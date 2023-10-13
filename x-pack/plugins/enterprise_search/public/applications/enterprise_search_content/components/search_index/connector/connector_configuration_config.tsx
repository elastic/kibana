/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  ConnectorConfigProperties,
  ConnectorConfiguration,
  ConnectorStatus,
} from '@kbn/search-connectors';

import { ConnectorConfigurationForm } from './connector_configuration_form';
import { sortAndFilterConnectorConfiguration } from './utils/connector_configuration_utils';

function entryToDisplaylistItem(entry: ConfigEntryView): { description: string; title: string } {
  return {
    description: entry.sensitive && !!entry.value ? '********' : String(entry.value) || '--',
    title: entry.label,
  };
}

interface ConnectorConfigurationProps {
  configuration: ConnectorConfiguration;
  connectorStatus: ConnectorStatus;
  error: string | undefined;
  hasDocumentLevelSecurity: boolean;
  hasPlatinumLicense: boolean;
  isLoading: boolean;
  isNative?: boolean;
  saveConfig: (configuration: Record<string, string | number | boolean | null>) => void;
}

interface ConfigEntry extends ConnectorConfigProperties {
  key: string;
}

export interface ConfigEntryView extends ConfigEntry {
  is_valid: boolean;
  validation_errors: string[];
}

export interface CategoryEntry {
  configEntries: ConfigEntryView[];
  key: string;
  label: string;
  order: number;
}

export interface ConfigView {
  advancedConfigurations: ConfigEntryView[];
  categories: CategoryEntry[];
  unCategorizedItems: ConfigEntryView[];
}

export const ConnectorConfigurationConfig: React.FC<ConnectorConfigurationProps> = ({
  children,
  configuration,
  connectorStatus,
  error,
  hasDocumentLevelSecurity,
  hasPlatinumLicense,
  isLoading,
  isNative = false,
  saveConfig,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigView>(
    sortAndFilterConnectorConfiguration(configuration, isNative)
  );

  useEffect(() => {
    setEditingConfig(sortAndFilterConnectorConfiguration(configuration, isNative));
  }, [isEditing]);

  useEffect(() => {
    if (
      Object.keys(configuration).length > 0 &&
      (connectorStatus === ConnectorStatus.CREATED ||
        connectorStatus === ConnectorStatus.NEEDS_CONFIGURATION)
    ) {
      // Only start in edit mode if we haven't configured yet
      // Necessary to prevent a race condition between saving config and getting updated connector
      setIsEditing(true);
    }
  });

  const configView = sortAndFilterConnectorConfiguration(configuration, isNative);

  const uncategorizedDisplayList = configView.unCategorizedItems.map(entryToDisplaylistItem);

  return (
    <EuiFlexGroup direction="column">
      {children && <EuiFlexItem>{children}</EuiFlexItem>}
      <EuiFlexItem>
        {isEditing ? (
          <ConnectorConfigurationForm
            cancelEditing={() => setIsEditing(false)}
            configView={editingConfig}
            hasDocumentLevelSecurity={hasDocumentLevelSecurity}
            hasPlatinumLicense={hasPlatinumLicense}
            isLoading={isLoading}
            saveConfig={saveConfig}
          />
        ) : (
          uncategorizedDisplayList.length > 0 && (
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiDescriptionList
                  listItems={uncategorizedDisplayList}
                  className="eui-textBreakWord"
                />
              </EuiFlexItem>
              {configView.categories.length > 0 &&
                configView.categories.map((category) => (
                  <EuiFlexGroup direction="column" key={category.key}>
                    <EuiFlexItem>
                      <EuiTitle size="s">
                        <h3>{category.label}</h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiDescriptionList
                        listItems={category.configEntries.map(entryToDisplaylistItem)}
                        className="eui-textBreakWord"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      data-test-subj="entSearchContent-connector-configuration-editConfiguration"
                      data-telemetry-id="entSearchContent-connector-overview-configuration-editConfiguration"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.indices.configurationConnector.config.editButton.title',
                        {
                          defaultMessage: 'Edit configuration',
                        }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
        )}
      </EuiFlexItem>
      {!!error && (
        <EuiFlexItem>
          <EuiCallOut
            color="danger"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.config.error.title',
              {
                defaultMessage: 'Connector error',
              }
            )}
          >
            <EuiText size="s">{error}</EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
