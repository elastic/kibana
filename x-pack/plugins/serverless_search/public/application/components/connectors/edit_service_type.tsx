/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormLabel,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';
import { useConnector } from '../../hooks/api/use_connector';

interface EditServiceTypeProps {
  connector: Connector;
}

export const EditServiceType: React.FC<EditServiceTypeProps> = ({ connector }) => {
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
      return inputServiceType;
    },
    onSuccess: (successData) => {
      queryClient.setQueryData(queryKey, {
        connector: { ...connector, service_type: successData },
      });
      queryClient.invalidateQueries(queryKey);
    },
  });

  return (
    <EuiForm>
      <EuiFormLabel data-test-subj="serverlessSearchEditConnectorTypeLabel">
        {i18n.translate('xpack.serverlessSearch.connectors.serviceTypeLabel', {
          defaultMessage: 'Connector type',
        })}
      </EuiFormLabel>
      <EuiSuperSelect
        // We only want to allow people to set the service type once to avoid weird conflicts
        disabled={Boolean(connector.service_type)}
        data-test-subj="serverlessSearchEditConnectorTypeChoices"
        isLoading={isLoading}
        onChange={(event) => mutate(event)}
        options={options}
        valueOfSelected={connector.service_type || undefined}
      />
    </EuiForm>
  );
};
