/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer } from '@elastic/eui';
import { Connector, ConnectorConfigurationComponent } from '@kbn/search-connectors';
import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useConnector } from '../../../hooks/api/use_connector';
import { useEditConnectorConfiguration } from '../../../hooks/api/use_connector_configuration';
import { ConnectorIndexnamePanel } from './connector_index_name_panel';

interface ConnectorConfigurationPanels {
  connector: Connector;
}

export const ConnectorConfigurationPanels: React.FC<ConnectorConfigurationPanels> = ({
  connector,
}) => {
  const { data, isLoading, isSuccess, mutate, reset } = useEditConnectorConfiguration(connector.id);
  const { queryKey } = useConnector(connector.id);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isSuccess) {
      queryClient.setQueryData(queryKey, { connector: { ...connector, configuration: data } });
      queryClient.invalidateQueries(queryKey);
      reset();
    }
  }, [data, isSuccess, connector, queryClient, queryKey, reset]);

  return (
    <>
      <EuiPanel hasBorder>
        <ConnectorConfigurationComponent
          connector={connector}
          hasPlatinumLicense={false}
          isLoading={isLoading}
          saveConfig={mutate}
        />
        <EuiSpacer />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder>
        <ConnectorIndexnamePanel connector={connector} />
      </EuiPanel>
    </>
  );
};
