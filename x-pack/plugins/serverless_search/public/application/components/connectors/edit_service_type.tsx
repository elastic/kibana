/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiIcon, EuiFormRow, EuiSuperSelect } from '@elastic/eui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useConnector } from '../../hooks/api/use_connector';

interface EditServiceTypeProps {
  connector: Connector;
  isDisabled?: boolean;
}

interface GeneratedConnectorNameResult {
  connectorName: string;
  indexName: string;
}

export const EditServiceType: React.FC<EditServiceTypeProps> = ({ connector, isDisabled }) => {
  const { http } = useKibanaServices();
  const connectorTypes = useConnectorTypes();
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);

  const options =
    connectorTypes.map((connectorType) => ({
      inputDisplay: (
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiFlexItem
            grow={false}
            data-test-subj={`serverlessSearchConnectorServiceType-${connectorType.serviceType}`}
          >
            <EuiIcon
              size="l"
              title={connectorType.name}
              id={connectorType.serviceType}
              type={connectorType.iconPath}
            />
          </EuiFlexItem>
          <EuiFlexItem>{connectorType.name}</EuiFlexItem>
        </EuiFlexGroup>
      ),
      value: connectorType.serviceType,
    })) || [];

  const { isLoading, mutate } = useMutation({
    mutationFn: async (inputServiceType: string) => {
      const body = { service_type: inputServiceType };
      await http.post(`/internal/serverless_search/connectors/${connector.id}/service_type`, {
        body: JSON.stringify(body),
      });

      // if name is empty, auto generate it and a similar index name
      const results: Record<string, GeneratedConnectorNameResult> = await http.post(
        `/internal/serverless_search/connectors/${connector.id}/generate_name`,
        {
          body: JSON.stringify({ name: connector.name, service_type: inputServiceType }),
        }
      );

      const connectorName = results.result.connectorName;
      const indexName = results.result.indexName;

      // save the generated connector name
      await http.post(`/internal/serverless_search/connectors/${connector.id}/name`, {
        body: JSON.stringify({ name: connectorName || '' }),
      });

      // save the generated index name (this does not create an index)
      try {
        // this can fail if another connector has an identical index_name value despite no index being created yet.
        // in this case we just won't update the index_name, the user can do that manually when they reach that step.
        await http.post(`/internal/serverless_search/connectors/${connector.id}/index_name`, {
          body: JSON.stringify({ index_name: indexName }),
        });
      } catch {
        // do nothing
      }

      return { serviceType: inputServiceType, name: connectorName };
    },
    onSuccess: (successData) => {
      queryClient.setQueryData(queryKey, {
        connector: { ...connector, service_type: successData.serviceType, name: successData.name },
      });
      queryClient.invalidateQueries(queryKey);
    },
  });

  return (
    <EuiFormRow
      label={i18n.translate('xpack.serverlessSearch.connectors.serviceTypeLabel', {
        defaultMessage: 'Connector type',
      })}
      data-test-subj="serverlessSearchEditConnectorType"
      fullWidth
    >
      <EuiSuperSelect
        // We only want to allow people to set the service type once to avoid weird conflicts
        disabled={Boolean(connector.service_type) || isDisabled}
        data-test-subj="serverlessSearchEditConnectorTypeChoices"
        isLoading={isLoading}
        onChange={(event) => mutate(event)}
        options={options}
        valueOfSelected={connector.service_type || undefined}
        fullWidth
      />
    </EuiFormRow>
  );
};
