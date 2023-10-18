/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Connector } from '@kbn/search-connectors';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { useConnector } from '../../../hooks/api/use_connector';
import { useIndexNameSearch } from '../../../hooks/api/use_index_name_search';
import { useKibanaServices } from '../../../hooks/use_kibana';

interface ConnectorIndexNameProps {
  connector: Connector;
}

export const ConnectorIndexName: React.FC<ConnectorIndexNameProps> = ({ connector }) => {
  const { http, notifications } = useKibanaServices();
  const [query, setQuery] = useState('');
  const { data: indexNames, isLoading: isLoadingIndices, refetch } = useIndexNameSearch(query);
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);
  const { data, error, isLoading, isSuccess, mutate, reset } = useMutation({
    mutationFn: async (inputName: string) => {
      const body = { index_name: inputName };
      await http.post(`/internal/serverless_search/connectors/${connector.id}/index_name`, {
        body: JSON.stringify(body),
      });
      return inputName;
    },
  });

  useEffect(() => {
    refetch();
  }, [query, refetch]);

  useEffect(() => {
    if (isSuccess) {
      queryClient.setQueryData(queryKey, { connector: { ...connector, index_name: data } });
      queryClient.invalidateQueries(queryKey);
      reset();
    }
  }, [data, isSuccess, connector, queryClient, queryKey, reset]);

  useEffect(() => {
    if (error) {
      notifications.toasts.addError(new Error(error as string), {
        title: i18n.translate('xpack.serverlessSearch.connectors.config.connectorIndexNameError', {
          defaultMessage: 'Error updating index name',
        }),
      });
    }
  }, [error, notifications]);

  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.serverlessSearch.connectors.config.connectorIndexNameTitle', {
              defaultMessage: 'Link index',
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued">
          {i18n.translate(
            'xpack.serverlessSearch.connectors.config.connectorIndexNameDescription',
            {
              defaultMessage:
                'Pick an index where your documents will be synced, or create a new one for this connector.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.serverlessSearch.connectors.config.indexNameLabel', {
              defaultMessage: 'Create or select an index',
            })}
            fullWidth
          >
            <EuiComboBox
              async
              customOptionText={i18n.translate(
                'xpack.serverlessSearch.connectors.config.createIndexLabel',
                {
                  defaultMessage: 'The connector will create the index {searchValue}',
                  values: { searchValue: '{searchValue}' },
                }
              )}
              isDisabled={isLoading}
              isLoading={isLoadingIndices}
              onChange={(values) => {
                if (values[0].value) {
                  mutate(values[0]?.value);
                }
              }}
              onCreateOption={(value) => mutate(value)}
              onSearchChange={(value) => setQuery(value)}
              options={(indexNames?.index_names || []).map((name) => ({
                label: name,
                value: name,
              }))}
              selectedOptions={[
                { label: connector.index_name || '', value: connector.index_name || '' },
              ]}
              singleSelection
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
