/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStep,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { ApiKey } from '@kbn/security-plugin-types-common';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { ApiKeySelectableTokenField } from '@kbn/security-api-key-management';
import {
  SecurityCreateApiKeyResponse,
  SecurityUpdateApiKeyResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { useKibanaServices } from '../../hooks/use_kibana';
import { MANAGEMENT_API_KEYS } from '../../../../common/routes';
import { CreateApiKeyFlyout } from './create_api_key_flyout';
import './api_key.scss';

function isCreatedResponse(
  value: SecurityCreateApiKeyResponse | SecurityUpdateApiKeyResponse
): value is SecurityCreateApiKeyResponse {
  if ((value as SecurityCreateApiKeyResponse).id) {
    return true;
  }
  return false;
}

export const ApiKeyPanel = ({ setClientApiKey }: { setClientApiKey: (value: string) => void }) => {
  const { http, user } = useKibanaServices();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['apiKey'],
    queryFn: () => http.fetch<{ apiKeys: ApiKey[] }>('/internal/serverless_search/api_keys'),
  });
  const [apiKey, setApiKey] = useState<SecurityCreateApiKeyResponse | undefined>(undefined);
  const saveApiKey = (value: SecurityCreateApiKeyResponse) => {
    setApiKey(value);
  };

  useEffect(() => {
    if (apiKey) {
      setClientApiKey(apiKey.encoded);
      setIsFlyoutOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  return (
    <>
      {isFlyoutOpen && (
        <CreateApiKeyFlyout
          onClose={() => setIsFlyoutOpen(false)}
          setApiKey={(value) => {
            if (isCreatedResponse(value)) {
              saveApiKey(value);
            }
          }}
          user={user}
        />
      )}
      {apiKey ? (
        <EuiPanel className="apiKeySuccessPanel" data-test-subj="api-key-create-success-panel">
          <EuiStep
            css={css`
              .euiStep__content {
                padding-bottom: 0;
              }
            `}
            status="complete"
            headingElement="h3"
            title={i18n.translate('xpack.serverlessSearch.apiKey.apiKeyStepTitle', {
              defaultMessage: 'Store this API key',
            })}
            titleSize="xs"
          >
            <EuiText>
              {i18n.translate('xpack.serverlessSearch.apiKey.apiKeyStepDescription', {
                defaultMessage:
                  "You'll only see this key once, so save it somewhere safe. We don't store your API keys, so if you lose a key you'll need to generate a replacement.",
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <ApiKeySelectableTokenField createdApiKey={apiKey} />
          </EuiStep>
        </EuiPanel>
      ) : (
        <EuiPanel>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.serverlessSearch.apiKey.panel.title', {
                defaultMessage: 'Add an API Key',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            {i18n.translate('xpack.serverlessSearch.apiKey.panel.description', {
              defaultMessage:
                'Use an existing key, or create a new one and copy it somewhere safe.',
            })}
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="m">
                <EuiFlexItem>
                  <span>
                    <EuiButton
                      iconType="plusInCircleFilled"
                      size="s"
                      fill
                      onClick={() => setIsFlyoutOpen(true)}
                      data-test-subj="new-api-key-button"
                      aria-label={i18n.translate(
                        'xpack.serverlessSearch.apiKey.newButton.ariaLabel',
                        {
                          defaultMessage: 'Add new API key',
                        }
                      )}
                    >
                      <EuiText size="s">
                        {i18n.translate('xpack.serverlessSearch.apiKey.newButtonLabel', {
                          defaultMessage: 'New',
                        })}
                      </EuiText>
                    </EuiButton>
                  </span>
                </EuiFlexItem>
                <EuiFlexItem>
                  <span>
                    <EuiButton
                      iconType="popout"
                      size="s"
                      href={http.basePath.prepend(MANAGEMENT_API_KEYS)}
                      target="_blank"
                      data-test-subj="manage-api-keys-button"
                      aria-label={i18n.translate('xpack.serverlessSearch.apiKey.manage.ariaLabel', {
                        defaultMessage: 'Manage API keys',
                      })}
                    >
                      {i18n.translate('xpack.serverlessSearch.apiKey.manageLabel', {
                        defaultMessage: 'Manage',
                      })}
                    </EuiButton>
                  </span>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              {!!data?.apiKeys && (
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon size="s" type="iInCircle" color="subdued" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.serverlessSearch.apiKey.activeKeys"
                        defaultMessage="You have {number} active keys."
                        values={{
                          number: (
                            <EuiBadge
                              color={data.apiKeys.length > 0 ? 'success' : 'warning'}
                              data-test-subj="api-keys-count-badge"
                            >
                              {data.apiKeys.length}
                            </EuiBadge>
                          ),
                        }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </>
  );
};
