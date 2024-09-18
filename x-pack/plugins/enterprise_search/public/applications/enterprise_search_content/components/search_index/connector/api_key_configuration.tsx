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
  EuiCallOut,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

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

export const ApiKeyConfig: React.FC<{
  hasApiKey: boolean;
  indexName: string;
  isNative: boolean;
}> = ({ hasApiKey, indexName, isNative }) => {
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
      makeRequest({ indexName, isNative });
    }
  };

  const [isModalVisible, setIsModalVisible] = useState(false);

  const onCancel = () => {
    setIsModalVisible(false);
  };

  const onConfirm = () => {
    makeRequest({ indexName, isNative });
    setIsModalVisible(false);
  };

  return (
    <EuiFlexGroup direction="column">
      {isModalVisible && <ConfirmModal onCancel={onCancel} onConfirm={onConfirm} />}
      <EuiFlexItem>
        <EuiText size="s">
          {isNative
            ? i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnector.apiKey.description',
                {
                  defaultMessage: `This native connector's API key {apiKeyName} is managed internally by Elasticsearch. The connector uses this API key to index documents into the {indexName} index. To refresh your API key, click "Generate API key".`,
                  values: {
                    apiKeyName: `${indexName}-connector`,
                    indexName,
                  },
                }
              )
            : i18n.translate(
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
      {!isNative || status === Status.LOADING ? (
        <></>
      ) : indexName === '' ? (
        <EuiCallOut
          iconType="iInCircle"
          title={i18n.translate(
            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.nativeConnector.apiKey.waitingForAttachedIndex',
            {
              defaultMessage:
                'An API key will be automatically generated when an index is attached to this connector.',
            }
          )}
        />
      ) : !hasApiKey ? (
        <EuiCallOut
          iconType="warning"
          color="danger"
          title={i18n.translate(
            'xpack.enterpriseSearch.content.connector_detail.configurationConnector.nativeConnector.apiKey.missing',
            {
              defaultMessage: 'This connector is missing an API key.',
            }
          )}
        />
      ) : (
        <></>
      )}
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="enterpriseSearchApiKeyConfigGenerateApiKeyButton"
              onClick={clickGenerateApiKey}
              isLoading={status === Status.LOADING}
              isDisabled={indexName.length === 0}
              data-telemetry-id="entSearch-content-connector-generateApiKeyButton"
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.apiKey.button.label',
                {
                  defaultMessage: 'Generate API key',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          {status === Status.SUCCESS && (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                color="success"
                size="s"
                iconType="check"
                title={
                  <FormattedMessage
                    id="xpack.enterpriseSearch.apiKeyConfig.newApiKeyCreatedCalloutLabel"
                    defaultMessage="New API key created succesfully"
                  />
                }
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      {data && !isNative && (
        <>
          <EuiSpacer />
          <EuiFlexItem>
            <ApiKey
              apiKey={data?.encoded}
              label={i18n.translate('xpack.enterpriseSearch.apiKeyConfig.apiKey.apiKeyLabel', {
                defaultMessage: 'API Key',
              })}
            />
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
};
