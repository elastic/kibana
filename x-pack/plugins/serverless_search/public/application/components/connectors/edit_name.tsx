/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiButtonIcon,
  EuiFieldText,
  EuiForm,
  EuiButton,
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { CANCEL_LABEL, CONNECTOR_LABEL, SAVE_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnector } from '../../hooks/api/use_connector';

interface EditNameProps {
  connector: Connector;
}

export const EditName: React.FC<EditNameProps> = ({ connector }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(connector.name || CONNECTOR_LABEL);
  const { http } = useKibanaServices();
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);

  useEffect(() => setNewName(connector.name), [connector.name]);

  const { isLoading, mutate } = useMutation({
    mutationFn: async (inputName: string) => {
      const body = { name: inputName };
      await http.post(`/internal/serverless_search/connectors/${connector.id}/name`, {
        body: JSON.stringify(body),
      });
      return inputName;
    },
    onSuccess: (successData) => {
      queryClient.setQueryData(queryKey, {
        connector: { ...connector, service_type: successData },
      });
      queryClient.invalidateQueries(queryKey);
      setIsEditing(false);
    },
  });

  return (
    <EuiFlexGroup direction="row">
      {!isEditing ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiTitle data-test-subj="serverlessSearchConnectorName">
              <h1>{connector.name || CONNECTOR_LABEL}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              justify-content: center;
            `}
          >
            <EuiButtonIcon
              data-test-subj="serverlessSearchEditNameButton"
              color="text"
              iconType="pencil"
              aria-label={i18n.translate('xpack.serverlessSearch.connectors.editNameLabel', {
                defaultMessage: 'Edit connector name',
              })}
              onClick={() => setIsEditing(true)}
            />
          </EuiFlexItem>
        </>
      ) : (
        <EuiForm>
          <EuiFlexItem grow={false}>
            <EuiFormLabel>
              {i18n.translate('xpack.serverlessSearch.connectors.nameLabel', {
                defaultMessage: 'Name',
              })}
            </EuiFormLabel>
            <EuiFieldText
              data-test-subj="serverlessSearchEditNameFieldText"
              onChange={(event) => setNewName(event.target.value)}
              value={newName}
            />
          </EuiFlexItem>
          <EuiSpacer />
          <EuiFlexGroup direction="row" justifyContent="center" alignItems="center">
            <EuiFlexItem
              grow={false}
              css={css`
                justify-content: center;
              `}
            >
              <EuiButton
                data-test-subj="serverlessSearchSaveNameButton"
                color="primary"
                fill
                type="submit"
                onClick={() => mutate(newName)}
                size="s"
                isLoading={isLoading}
              >
                {SAVE_LABEL}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem
              grow={false}
              css={css`
                justify-content: center;
              `}
            >
              <EuiButton
                data-test-subj="serverlessSearchCancelNameButton"
                size="s"
                isLoading={isLoading}
                onClick={() => {
                  setNewName(connector.name);
                  setIsEditing(false);
                }}
              >
                {CANCEL_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      )}
    </EuiFlexGroup>
  );
};
