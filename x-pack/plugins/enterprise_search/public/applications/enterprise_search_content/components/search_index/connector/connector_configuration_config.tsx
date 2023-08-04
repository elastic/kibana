/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

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

import { IndexViewLogic } from '../index_view_logic';

import { ConnectorConfigurationForm } from './connector_configuration_form';
import { ConfigEntryView, ConnectorConfigurationLogic } from './connector_configuration_logic';

function entryToDisplaylistItem(entry: ConfigEntryView): { description: string; title: string } {
  return {
    description: entry.sensitive && !!entry.value ? '********' : String(entry.value) || '--',
    title: entry.label,
  };
}

export const ConnectorConfigurationConfig: React.FC = ({ children }) => {
  const { connectorError } = useValues(IndexViewLogic);
  const { configView, isEditing } = useValues(ConnectorConfigurationLogic);
  const { setIsEditing } = useActions(ConnectorConfigurationLogic);

  const uncategorizedDisplayList = configView.unCategorizedItems.map(entryToDisplaylistItem);

  return (
    <EuiFlexGroup direction="column">
      {children && <EuiFlexItem>{children}</EuiFlexItem>}
      <EuiFlexItem>
        {isEditing ? (
          <ConnectorConfigurationForm />
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
      {!!connectorError && (
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
            <EuiText size="s">{connectorError}</EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
