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
  EuiButton,
  EuiSpacer,
  EuiFormRow,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Connector } from '@kbn/search-connectors';
import { CANCEL_LABEL, EDIT_LABEL, SAVE_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';
import { useConnector } from '../../hooks/api/use_connector';

interface EditDescriptionProps {
  isDisabled?: boolean;
  connector: Connector;
}

export const EditDescription: React.FC<EditDescriptionProps> = ({ connector, isDisabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newDescription, setNewDescription] = useState(connector.description || '');
  const { http } = useKibanaServices();
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
    onSuccess: (successData) => {
      queryClient.setQueryData(queryKey, {
        connector: { ...connector, description: successData },
      });
      queryClient.invalidateQueries(queryKey);
      setIsEditing(false);
    },
  });

  return (
    <EuiFormRow
      helpText={
        !isEditing &&
        i18n.translate('xpack.serverlessSearch.connectors.descriptionHelpText', {
          defaultMessage: 'Optional description for your connector.',
        })
      }
      label={i18n.translate('xpack.serverlessSearch.connectors.descriptionLabel', {
        defaultMessage: 'Description',
      })}
      labelAppend={
        isDisabled ? undefined : (
          <EuiText size="xs">
            <EuiLink
              data-test-subj="serverlessSearchEditDescriptionButton"
              onClick={() => setIsEditing(true)}
              role="button"
            >
              {EDIT_LABEL}
            </EuiLink>
          </EuiText>
        )
      }
      fullWidth
    >
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          {isEditing ? (
            <EuiFieldText
              data-test-subj="serverlessSearchEditDescriptionFieldText"
              onChange={(event) => setNewDescription(event.target.value)}
              value={newDescription || ''}
              fullWidth
            />
          ) : (
            <EuiText size="s" data-test-subj="serverlessSearchConnectorDescription">
              {connector.description}
            </EuiText>
          )}
        </EuiFlexItem>
        {isEditing && (
          <EuiFlexItem>
            <EuiSpacer size="s" />
            <EuiFlexGroup direction="row" justifyContent="flexStart" gutterSize="s">
              <EuiFlexItem
                grow={false}
                css={css`
                  justify-content: center;
                `}
              >
                <EuiButton
                  data-test-subj="serverlessSearchSaveDescriptionButton"
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
                  data-test-subj="serverlessSearchCancelDescriptionButton"
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
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
