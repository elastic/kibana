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
  EuiFieldText,
  EuiForm,
  EuiButton,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { CANCEL_LABEL, EDIT_LABEL, SAVE_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnector } from '../../hooks/api/use_connector';
import { useShowErrorToast } from '../../hooks/use_error_toast';

interface EditDescriptionProps {
  connector: Connector;
}

export const EditDescription: React.FC<EditDescriptionProps> = ({ connector }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newDescription, setNewDescription] = useState(connector.description || '');
  const { http } = useKibanaServices();
  const showErrorToast = useShowErrorToast();
  const queryClient = useQueryClient();
  const { queryKey } = useConnector(connector.id);

  useEffect(() => setNewDescription(connector.description || ''), [connector.description]);

  const { isLoading, mutate } = useMutation({
    mutationFn: async (inputDescription: string) => {
      const body = { description: inputDescription };
      await http.post(`/internal/serverless_search/connectors/${connector.id}/description`, {
        body: JSON.stringify(body),
      });
      return inputDescription;
    },
    onError: (error) =>
      showErrorToast(
        error,
        i18n.translate('xpack.serverlessSearch.connectors.config.connectorDescription', {
          defaultMessage: 'Error updating description',
        })
      ),
    onSuccess: (successData) => {
      queryClient.setQueryData(queryKey, {
        connector: { ...connector, description: successData },
      });
      queryClient.invalidateQueries(queryKey);
      setIsEditing(false);
    },
  });

  return (
    <EuiFlexGroup direction="row">
      <EuiForm>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            helpText={i18n.translate('xpack.serverlessSearch.connectors.descriptionHelpText', {
              defaultMessage: 'Optional description for your connector.',
            })}
            label={i18n.translate('xpack.serverlessSearch.connectors.descriptionLabel', {
              defaultMessage: 'Description',
            })}
            labelAppend={
              <EuiButtonEmpty size="xs" onClick={() => setIsEditing(true)}>
                {EDIT_LABEL}
              </EuiButtonEmpty>
            }
          >
            {isEditing ? (
              <EuiFieldText
                onChange={(event) => setNewDescription(event.target.value)}
                value={newDescription || ''}
              />
            ) : (
              <EuiText size="s">{connector.description}</EuiText>
            )}
          </EuiFormRow>
        </EuiFlexItem>
        {isEditing && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="row" justifyContent="center" alignItems="center">
              <EuiFlexItem
                grow={false}
                css={css`
                  justify-content: center;
                `}
              >
                <EuiButton
                  color="primary"
                  fill
                  onClick={() => mutate(newDescription)}
                  type="submit"
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
                  size="s"
                  isLoading={isLoading}
                  onClick={() => {
                    setNewDescription(connector.description || '');
                    setIsEditing(false);
                  }}
                >
                  {CANCEL_LABEL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiForm>
    </EuiFlexGroup>
  );
};
