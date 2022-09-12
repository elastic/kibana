/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiSteps } from '@elastic/eui';

import { isConnectorIndex } from '../../../../utils/indices';

import { IndexViewLogic } from '../../index_view_logic';

import { NATIVE_CONNECTORS } from '../constants';

import { ConnectorNameAndDescription } from './connector_name_and_description';
import { NativeConnectorAdvancedConfiguration } from './native_connector_advanced_configuration';
import { NativeConnectorConfigurationConfig } from './native_connector_configuration_config';
import { ResearchConfiguration } from './research_configuration';

export const NativeConnectorConfiguration: React.FC = () => {
  const { index: indexData } = useValues(IndexViewLogic);

  if (!isConnectorIndex(indexData)) {
    return <></>;
  }

  const nativeConnector = NATIVE_CONNECTORS.find(
    (connector) => connector.serviceType === indexData.connector.service_type
  );

  if (!nativeConnector) {
    return <></>;
  }

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiPanel hasShadow={false} hasBorder>
            <EuiSteps
              steps={[
                {
                  children: <ResearchConfiguration nativeConnector={nativeConnector} />,
                  status: 'incomplete',
                  title: 'Research configuration requirements',
                  titleSize: 'xs',
                },
                {
                  children: <ConnectorNameAndDescription nativeConnector={nativeConnector} />,
                  status: 'incomplete',
                  title: 'Name and description',
                  titleSize: 'xs',
                },
                {
                  children: (
                    <NativeConnectorConfigurationConfig
                      configuration={indexData.connector.configuration}
                      nativeConnector={nativeConnector}
                    />
                  ),
                  status: 'incomplete',
                  title: 'Configuration',
                  titleSize: 'xs',
                },
                {
                  children: <NativeConnectorAdvancedConfiguration />,
                  status: 'incomplete',
                  title: 'Advanced configuration',
                  titleSize: 'xs',
                },
              ]}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
