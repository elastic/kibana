/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiBadge,
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiButton,
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Connector, CONNECTORS_INDEX } from '@kbn/search-connectors';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { OPTIONAL_LABEL } from '../../../../../common/i18n_string';
import { useCreateApiKey } from '../../../hooks/api/use_create_api_key';
import { useGetApiKeys } from '../../../hooks/api/use_api_key';
interface ApiKeyPanelProps {
  connector: Connector;
}
export const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({ connector }) => {
  const { data, isLoading, mutate } = useCreateApiKey();
  const { data: apiKeysData } = useGetApiKeys();
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.serverlessSearch.connectors.config.apiKeyTitle', {
                defaultMessage: 'Prepare an API key',
              })}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge>{OPTIONAL_LABEL}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiText color="subdued">
        <FormattedMessage
          id="xpack.serverlessSearch.connectors.config.apiKeyDescription"
          defaultMessage="You can limit the connector's API key to only have access to the above index. Once created, use this key to set the {apiKey} variable in your {config} file."
          values={{
            apiKey: <EuiCode>api_key</EuiCode>,
            config: <EuiCode>config.yml</EuiCode>,
          }}
        />
      </EuiText>
      <EuiSpacer />
      <span>
        <EuiButton
          data-test-subj="serverlessSearchApiKeyPanelNewApiKeyButton"
          isDisabled={!connector.index_name || !apiKeysData?.canManageOwnApiKey}
          isLoading={isLoading}
          iconType="plusInCircle"
          color="primary"
          onClick={() => {
            if (connector.index_name) {
              mutate({
                name: `${connector.index_name}-connector`,
                role_descriptors: {
                  [`${connector.index_name}-connector-role`]: {
                    cluster: ['monitor'],
                    index: [
                      {
                        names: [
                          connector.index_name,
                          connector.index_name.replace(
                            /^(?:search-)?(.*)$/,
                            '.search-acl-filter-$1'
                          ),
                          `${CONNECTORS_INDEX}*`,
                        ],
                        privileges: ['all'],
                      },
                    ],
                  },
                },
              });
            }
          }}
        >
          {i18n.translate('xpack.serverlessSearch.connectors.config.createApikeyLabel', {
            defaultMessage: 'New API key',
          })}
        </EuiButton>
      </span>
      <EuiSpacer />
      {Boolean(data) && <EuiCodeBlock isCopyable>{data?.encoded}</EuiCodeBlock>}
    </EuiPanel>
  );
};
