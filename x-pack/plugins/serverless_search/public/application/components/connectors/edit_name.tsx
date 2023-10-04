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
import { useMutation } from '@tanstack/react-query';
import { CANCEL_LABEL, CONNECTOR_LABEL, SAVE_LABEL } from '../../../../common/i18n_string';
import { useKibanaServices } from '../../hooks/use_kibana';

interface EditNameProps {
  connectorId: string;
  name: string;
  onSuccess: () => void;
}

export const EditName: React.FC<EditNameProps> = ({ connectorId, name, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(name);
  const { http } = useKibanaServices();

  useEffect(() => setNewName(name), [name]);

  const { isLoading, isSuccess, mutate } = useMutation({
    mutationFn: async (inputName: string) => {
      const body = { name: inputName };
      const result = await http.post(`/internal/serverless_search/connectors/${connectorId}/name`, {
        body: JSON.stringify(body),
      });
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
      {!isEditing ? (
        <>
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>{name || CONNECTOR_LABEL}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              justify-content: center;
            `}
          >
            <EuiButtonIcon
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
            <EuiFieldText onChange={(event) => setNewName(event.target.value)} value={newName} />
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
                size="s"
                isLoading={isLoading}
                onClick={() => {
                  setNewName(name);
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
