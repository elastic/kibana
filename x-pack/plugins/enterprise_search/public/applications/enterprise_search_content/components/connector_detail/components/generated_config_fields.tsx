/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiConfirmModal,
  EuiCopy,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Connector } from '@kbn/search-connectors';

import { MANAGE_API_KEYS_URL } from '../../../../../../common/constants';
import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { ApiKey } from '../../../api/connector/generate_connector_api_key_api_logic';
import { CONNECTOR_DETAIL_PATH, SEARCH_INDEX_PATH } from '../../../routes';

export interface GeneratedConfigFieldsProps {
  apiKey?: ApiKey;
  connector: Connector;
  generateApiKey: () => void;
  isGenerateLoading: boolean;
}

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

export const GeneratedConfigFields: React.FC<GeneratedConfigFieldsProps> = ({
  apiKey,
  connector,
  generateApiKey,
  isGenerateLoading,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const refreshButtonClick = () => {
    setIsModalVisible(true);
  };
  const onCancel = () => {
    setIsModalVisible(false);
  };

  const onConfirm = () => {
    generateApiKey();
    setIsModalVisible(false);
  };

  return (
    <>
      {isModalVisible && <ConfirmModal onCancel={onCancel} onConfirm={onConfirm} />}
      <>
        <EuiFlexGrid columns={3} alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.connectorDeployment.connectorCreatedFlexItemLabel',
                      { defaultMessage: 'Connector created' }
                    )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLinkTo
              to={generateEncodedPath(CONNECTOR_DETAIL_PATH, {
                connectorId: connector.id,
              })}
            >
              {connector.name}
            </EuiLinkTo>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              responsive={false}
              gutterSize="xs"
              justifyContent="flexEnd"
              alignItems="center"
            >
              <EuiFlexItem grow={false}>
                <EuiLinkTo
                  to={generateEncodedPath(CONNECTOR_DETAIL_PATH, {
                    connectorId: connector.id,
                  })}
                >
                  {connector.id}
                </EuiLinkTo>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={connector.id}>
                  {(copy) => (
                    <EuiButtonIcon
                      size="xs"
                      data-test-subj="enterpriseSearchConnectorDeploymentButton"
                      iconType="copyClipboard"
                      onClick={copy}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate(
                  'xpack.enterpriseSearch.connectorDeployment.indexCreatedFlexItemLabel',
                  { defaultMessage: 'Index created' }
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            {connector.index_name && (
              <EuiLinkTo
                to={generateEncodedPath(SEARCH_INDEX_PATH, {
                  indexName: connector.index_name,
                })}
              >
                {connector.index_name}
              </EuiLinkTo>
            )}
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} gutterSize="xs">
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" />
              </EuiFlexItem>
              <EuiFlexItem>
                {i18n.translate(
                  'xpack.enterpriseSearch.connectorDeployment.apiKeyCreatedFlexItemLabel',
                  { defaultMessage: 'API key created' }
                )}
                {apiKey?.encoded && ` *`}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              data-test-subj="enterpriseSearchConnectorDeploymentLink"
              href={generateEncodedPath(MANAGE_API_KEYS_URL, {})}
              external
              target="_blank"
            >
              {apiKey?.name}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              responsive={false}
              gutterSize="xs"
              justifyContent="flexEnd"
              alignItems="center"
            >
              {apiKey?.encoded ? (
                <EuiFlexItem>
                  <EuiCopy textToCopy={apiKey?.encoded}>
                    {(copy) => (
                      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
                        <EuiFlexItem>
                          <EuiCode>{apiKey?.encoded}</EuiCode>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            data-test-subj="enterpriseSearchGeneratedConfigFieldsButton"
                            size="xs"
                            iconType="refresh"
                            isLoading={isGenerateLoading}
                            onClick={refreshButtonClick}
                            disabled={!connector.index_name}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            size="xs"
                            data-test-subj="enterpriseSearchConnectorDeploymentButton"
                            iconType="copyClipboard"
                            onClick={copy}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              ) : (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    data-test-subj="enterpriseSearchGeneratedConfigFieldsButton"
                    size="xs"
                    iconType="refresh"
                    isLoading={isGenerateLoading}
                    onClick={refreshButtonClick}
                    disabled={!connector.index_name}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGrid>

        {apiKey?.encoded && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              color="success"
              size="s"
              title={i18n.translate(
                'xpack.enterpriseSearch.connectorDeployment.generatedConfigCallout',
                {
                  defaultMessage: `You'll only see this API key once, so save it somewhere safe. We don't store your API keys, so if you lose a key you'll need to generate a replacement`,
                }
              )}
              iconType="asterisk"
            />
          </>
        )}
      </>
    </>
  );
};
