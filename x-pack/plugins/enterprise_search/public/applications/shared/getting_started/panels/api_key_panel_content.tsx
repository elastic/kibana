/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButton,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { ApiKey } from '@kbn/security-plugin/common';

import { KibanaLogic } from '../../kibana';

interface ApiKeyPanelContent {
  apiKeys?: ApiKey[];
  openApiKeyModal: () => void;
}

export const ApiKeyPanelContent: React.FC<ApiKeyPanelContent> = ({ apiKeys, openApiKeyModal }) => {
  return (
    <EuiPanel>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              {i18n.translate(
                'xpack.enterpriseSearch.content.overview.gettingStarted.generateApiKeyPanel.apiKeytitle',
                {
                  defaultMessage: 'Generate an API key',
                }
              )}
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText>
            {i18n.translate(
              'xpack.enterpriseSearch.content.overview.gettingStarted.generateApiKeyPanel.apiKeydesc',
              {
                defaultMessage:
                  'Your private, unique identifier for authentication and authorization.',
              }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" direction="row">
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    key="viewApiKeys"
                    iconType="plusInCircle"
                    onClick={openApiKeyModal}
                    fill
                  >
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.overview.documementExample.generateApiKeyButton.createNew',
                          { defaultMessage: 'New' }
                        )}
                      </p>
                    </EuiText>
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    key="viewApiKeys"
                    iconType="popout"
                    iconSide="right"
                    onClick={() =>
                      KibanaLogic.values.navigateToUrl('/app/management/security/api_keys', {
                        shouldNotCreateHref: true,
                      })
                    }
                  >
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.enterpriseSearch.content.overview.documementExample.generateApiKeyButton.viewAll',
                          { defaultMessage: 'Manage' }
                        )}
                      </p>
                    </EuiText>
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.enterpriseSearch.apiKey.activeKeys"
                      defaultMessage="{number} active API keys."
                      values={{
                        number: (
                          <EuiBadge
                            color={(apiKeys?.length || 0) > 0 ? 'success' : 'warning'}
                            data-test-subj="api-keys-count-badge"
                          >
                            {apiKeys?.length || 0}
                          </EuiBadge>
                        ),
                      }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
