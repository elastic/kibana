/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiSpacer,
  EuiConfirmModal,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { GenerateConnectorApiKeyApiLogic } from '../../../api/connector/generate_connector_api_key_api_logic';
import { ApiKey } from '../../api_key/api_key';

const ConfirmModal: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ onCancel, onConfirm }) => (
  <EuiConfirmModal
    title={i18n.translate(
      'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.title',
      {
        defaultMessage: 'Generate an Elasticsearch API key',
      }
    )}
    onCancel={onCancel}
    onConfirm={onConfirm}
    cancelButtonText={i18n.translate(
      'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.cancelButton.label',
      {
        defaultMessage: 'Cancel',
      }
    )}
    confirmButtonText={i18n.translate(
      'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.confirmButton.label',
      {
        defaultMessage: 'Generate API key',
      }
    )}
    defaultFocusedButton="confirm"
  >
    {i18n.translate(
      'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.description',
      {
        defaultMessage:
          'Generating a new API key will invalidate the previous key. Are you sure you want to generate a new API key? This can not be undone.',
      }
    )}
  </EuiConfirmModal>
);

export const ApiKeyConfig: React.FC<{ hasApiKey: boolean; indexName: string }> = ({
  hasApiKey,
  indexName,
}) => {
  const { makeRequest, apiReset } = useActions(GenerateConnectorApiKeyApiLogic);
  const { data, status } = useValues(GenerateConnectorApiKeyApiLogic);
  useEffect(() => {
    apiReset();
    return apiReset;
  }, [indexName]);

  const clickGenerateApiKey = () => {
    if (hasApiKey || data) {
      setIsModalVisible(true);
    } else {
      makeRequest({ indexName });
    }
  };

  const [isModalVisible, setIsModalVisible] = useState(false);

  const onCancel = () => {
    setIsModalVisible(false);
  };

  const onConfirm = () => {
    makeRequest({ indexName });
    setIsModalVisible(false);
  };

  return (
    <EuiFlexGroup direction="column">
      {isModalVisible && <ConfirmModal onCancel={onCancel} onConfirm={onConfirm} />}
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.description',
            {
              defaultMessage:
                'First, generate an Elasticsearch API key. This {apiKeyName} key will enable read and write permissions for the connector to index documents to the created {indexName} index. Save the key in a safe place, as you will need it to configure your connector.',
              values: {
                apiKeyName: `${indexName}-connector`,
                indexName,
              },
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={clickGenerateApiKey} isLoading={status === Status.LOADING}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.button.label',
                {
                  defaultMessage: 'Generate API key',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {data && (
        <>
          <EuiSpacer />
          <EuiFlexItem>
            <ApiKey apiKey={data?.encoded} label="API Key" />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
