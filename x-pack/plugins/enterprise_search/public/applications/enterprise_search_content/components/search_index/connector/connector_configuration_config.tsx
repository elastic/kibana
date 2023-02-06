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
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexViewLogic } from '../index_view_logic';

import { ConnectorConfigurationForm } from './connector_configuration_form';
import { ConnectorConfigurationLogic } from './connector_configuration_logic';

export const ConnectorConfigurationConfig: React.FC = ({ children }) => {
  const { connectorError } = useValues(IndexViewLogic);
  const { configView, isEditing } = useValues(ConnectorConfigurationLogic);
  const { setIsEditing } = useActions(ConnectorConfigurationLogic);

  const displayList = configView.map(({ label, value }) => ({
    description: value ?? '--',
    title: label,
  }));

  return (
    <EuiFlexGroup direction="column">
      {children && <EuiFlexItem>{children}</EuiFlexItem>}
      <EuiFlexItem>
        {isEditing ? (
          <ConnectorConfigurationForm />
        ) : (
          displayList.length > 0 && (
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiDescriptionList listItems={displayList} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiButton
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
