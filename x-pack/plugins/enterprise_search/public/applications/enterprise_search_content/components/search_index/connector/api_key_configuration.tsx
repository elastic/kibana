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
  EuiLink,
  EuiSpacer,
  EuiCallOut,
  EuiConfirmModal,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { GenerateConnectorApiKeyApiLogic } from '../../../api/connector_package/generate_connector_api_key_api_logic';
import { ApiKey } from '../../api_key/api_key';

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

  const confirmModal = (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.title',
        {
          defaultMessage: 'Generate an Elasticsearch API key.',
        }
      )}
      onCancel={(event) => {
        event?.preventDefault();
        setIsModalVisible(false);
      }}
      onConfirm={(event) => {
        event.preventDefault();
        makeRequest({ indexName });
        setIsModalVisible(false);
      }}
      cancelButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.cancelButton.label',
        {
          defaultMessage: 'Cancel',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.confirmButton.label',
        {
          defaultMessage: 'Generate an Elasticsearch API key',
        }
      )}
      defaultFocusedButton="confirm"
    >
      {i18n.translate(
        'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.confirmModal.description',
        {
          defaultMessage:
            'Generating a new Elasticsearch API key will invalidate the previous key. Are you sure you want to generate a new Elasticsearch API key? This can not be undone.',
        }
      )}
    </EuiConfirmModal>
  );

  return (
    <EuiFlexGroup direction="column">
      {isModalVisible && confirmModal}
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.description',
            {
              defaultMessage:
                'Keep your Elasticsearch API key somewhere safe while you configure your connector. Generating a new Elasticsearch API key will invalidate the previous key.',
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
                  defaultMessage: 'Generate an Elasticsearch API key',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href="https://elastic.co/" target="_blank">
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.documentation.label',
                {
                  defaultMessage: 'View the documentation',
                }
              )}
            </EuiLink>
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
      {hasApiKey && (
        <EuiFlexItem>
          <EuiCallOut
            title={i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.warning.title',
              { defaultMessage: 'An Elasticsearch API key is already in use' }
            )}
            color="warning"
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.warning.description',
              {
                defaultMessage:
                  'Generating a new Elasticsearch API key will invalidate the previous key.',
              }
            )}
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
