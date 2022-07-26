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
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConnectorConfiguration } from '../../../../../../common/types/connectors';

import { ConnectorConfigurationForm } from './connector_configuration_form';
import { ConnectorConfigurationLogic } from './connector_configuration_logic';

interface ConnectorConfigurationConfigArgs {
  apiKey: string | undefined;
  configuration: ConnectorConfiguration;
  connectorId: string;
  indexId: string;
  indexName: string;
}

export const ConnectorConfigurationConfig: React.FC<ConnectorConfigurationConfigArgs> = ({
  apiKey,
  connectorId,
}) => {
  const { configView, isEditing } = useValues(ConnectorConfigurationLogic);
  const { setIsEditing } = useActions(ConnectorConfigurationLogic);

  const ymlBlock = (
    <EuiCodeBlock fontSize="m" paddingSize="m" color="dark" isCopyable>
      {`${
        apiKey
          ? `elasticsearch:
  api_key: "${apiKey}"
`
          : ''
      }connector_id: "${connectorId}"
`}
    </EuiCodeBlock>
  );

  const displayList = configView.map(({ label, value }) => ({
    description: value ?? '--',
    title: label,
  }));

  const display = (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiDescriptionList listItems={displayList} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => setIsEditing(!isEditing)}>
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
  );

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.config.description',
            {
              defaultMessage:
                'Once done return to Enterprise Search and point to your connector instance using the authentication method of your choice.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.yml.description',
            {
              defaultMessage:
                'Use this YAML sample with your Elastic API key and Connector id to get going faster',
            }
          )}
        </EuiText>
        <EuiSpacer />
        {ymlBlock}
      </EuiFlexItem>
      <EuiFlexItem>
        {isEditing ? <ConnectorConfigurationForm /> : displayList.length > 0 && display}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
