/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
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
}

export const GeneratedConfigFields: React.FC<GeneratedConfigFieldsProps> = ({
  connector,
  apiKey,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGrid columns={3} alignItems="center" gutterSize="m">
      <EuiFlexItem css={{ minHeight: euiTheme.size.l }}>
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
                <EuiButtonEmpty
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
      <EuiFlexItem css={{ minHeight: euiTheme.size.l }}>
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
      <EuiFlexItem css={{ minHeight: euiTheme.size.l }}>
        <EuiFlexGroup responsive={false} gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiIcon type="check" />
          </EuiFlexItem>
          <EuiFlexItem>
            {i18n.translate(
              'xpack.enterpriseSearch.connectorDeployment.apiKeyCreatedFlexItemLabel',
              { defaultMessage: 'API key created' }
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink
          data-test-subj="enterpriseSearchConnectorDeploymentLink"
          href={generateEncodedPath(MANAGE_API_KEYS_URL, {})}
        >
          {connector.api_key_id || apiKey?.id}
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem>
        {apiKey?.encoded && (
          <EuiCopy textToCopy={apiKey?.encoded}>
            {(copy) => (
              <EuiFlexGroup responsive={false}>
                <EuiFlexItem>{apiKey?.encoded}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    data-test-subj="enterpriseSearchConnectorDeploymentButton"
                    iconType="copyClipboard"
                    onClick={copy}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiCopy>
        )}
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
