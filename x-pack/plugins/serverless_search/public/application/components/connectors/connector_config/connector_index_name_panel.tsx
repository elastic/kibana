/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Connector } from '@kbn/search-connectors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { isValidIndexName } from '../../../../utils/validate_index_name';
import { UPDATE_LABEL } from '../../../../../common/i18n_string';
import { useConnector } from '../../../hooks/api/use_connector';
import { useKibanaServices } from '../../../hooks/use_kibana';
import { ConnectorIndexNameForm } from './connector_index_name_form';

interface ConnectorIndexNamePanelProps {
  connector: Connector;
}

export const ConnectorIndexnamePanel: React.FC<ConnectorIndexNamePanelProps> = ({ connector }) => {
  const { http, notifications } = useKibanaServices();
  const { data, error, isLoading, isSuccess, mutate, reset } = useMutation({
    mutationFn: async (inputName: string) => {
      if (inputName && inputName !== connector.index_name) {
        const body = { index_name: inputName };
        await http.post(`/internal/serverless_search/connectors/${connector.id}/index_name`, {
          body: JSON.stringify(body),
        });
      }
      await http.post(`/internal/serverless_search/connectors/${connector.id}/sync`);
      return inputName;
    },
  });
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);

  useEffect(() => {
    if (isSuccess) {
      queryClient.setQueryData(queryKey, { connector: { ...connector, index_name: data } });
      queryClient.invalidateQueries(queryKey);
      reset();
    }
  }, [data, isSuccess, connector, queryClient, queryKey, reset]);

  useEffect(() => {
    if (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate('xpack.serverlessSearch.connectors.config.connectorIndexNameError', {
          defaultMessage: 'Error updating index name',
        }),
      });
    }
  }, [error, notifications]);

  const [newIndexName, setNewIndexName] = useState(connector.index_name || '');

  return (
    <>
      <ConnectorIndexNameForm
        isDisabled={isLoading}
        indexName={newIndexName}
        onChange={(name) => setNewIndexName(name)}
      />
      <EuiSpacer />
      <EuiFlexGroup alignItems="flexEnd" direction="row">
        <EuiFlexItem>
          <span>
            <EuiButton
              color="primary"
              disabled={!isValidIndexName(newIndexName)}
              fill
              isLoading={isLoading}
              onClick={() => mutate(newIndexName)}
            >
              {UPDATE_LABEL}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
