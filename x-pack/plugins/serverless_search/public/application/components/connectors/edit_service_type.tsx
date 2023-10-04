/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiForm,
  EuiFormLabel,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import { useMutation } from '@tanstack/react-query';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnectorTypes } from '../../hooks/api/use_connector_types';

interface EditServiceTypeProps {
  connectorId: string;
  serviceType: string;
  onSuccess: () => void;
}

export const EditServiceType: React.FC<EditServiceTypeProps> = ({
  connectorId,
  serviceType,
  onSuccess,
}) => {
  const { http } = useKibanaServices();
  const { data: connectorTypes } = useConnectorTypes();

  const options =
    connectorTypes?.connectors.map((connectorType) => ({
      inputDisplay: (
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiFlexItem grow={false}>
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

  const { isLoading, isSuccess, mutate } = useMutation({
    mutationFn: async (inputServiceType: string) => {
      const body = { service_type: inputServiceType };
      const result = await http.post(
        `/internal/serverless_search/connectors/${connectorId}/service_type`,
        {
          body: JSON.stringify(body),
        }
      );
      return result;
    },
  });

  useEffect(() => {
    if (isSuccess) {
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

  return (
    <EuiForm>
      <EuiFormLabel>
        {i18n.translate('xpack.serverlessSearch.connectors.serviceTypeLabel', {
          defaultMessage: 'Connector type',
        })}
      </EuiFormLabel>
      <EuiSuperSelect
        isLoading={isLoading}
        onChange={(event) => mutate(event)}
        options={options}
        valueOfSelected={serviceType ?? ''}
      />
    </EuiForm>
  );
};
