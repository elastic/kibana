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
import { useMutation } from '@tanstack/react-query';
import { CANCEL_LABEL, EDIT_LABEL, SAVE_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';

interface EditDescriptionProps {
  connectorId: string;
  description: string;
  onSuccess: () => void;
}

export const EditDescription: React.FC<EditDescriptionProps> = ({
  connectorId,
  description,
  onSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newDescription, setNewDescription] = useState(description);
  const { http } = useKibanaServices();

  useEffect(() => setNewDescription(description), [description]);

  const { isLoading, isSuccess, mutate } = useMutation({
    mutationFn: async (inputDescription: string) => {
      const body = { description: inputDescription };
      const result = await http.post(
        `/internal/serverless_search/connectors/${connectorId}/description`,
        {
          body: JSON.stringify(body),
        }
      );
      return result;
    },
  });

  useEffect(() => {
    if (isSuccess) {
      setIsEditing(false);
      onSuccess();
    }
  }, [isSuccess, onSuccess]);

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
                value={newDescription}
              />
            ) : (
              <EuiText size="s">{description}</EuiText>
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
                    setNewDescription(description);
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
