/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiStep,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AuthenticatedUser } from '@kbn/security-plugin/common';

import { Status } from '../../../../../common/types/api';

import { KibanaLogic } from '../../../shared/kibana';

import { CreateApiKeyAPILogic } from '../../api/create_elasticsearch_api_key_logic';
import { FetchApiKeysAPILogic } from '../../api/fetch_api_keys_logic';

import { CreateApiKeyFlyout } from './create_api_key_flyout';
import './api_key.scss';

interface ApiKeyPanelProps {
  user: AuthenticatedUser | null;
}

const COPIED_LABEL = i18n.translate('xpack.enterpriseSearch.overview.apiKey.copied', {
  defaultMessage: 'Copied',
});

const ELASTICSEARCH_URL_PLACEHOLDER = 'https://your_deployment_url';

export const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({ user }) => {
  const { cloud, navigateToUrl } = useValues(KibanaLogic);
  const { makeRequest } = useActions(FetchApiKeysAPILogic);
  const { makeRequest: saveApiKey } = useActions(CreateApiKeyAPILogic);
  const { data: apiKey, error, status } = useValues(CreateApiKeyAPILogic);
  const { data } = useValues(FetchApiKeysAPILogic);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useEffect(() => makeRequest({}), []);
  useEffect(() => {
    if (status === Status.SUCCESS) {
      setIsFlyoutOpen(false);
    }
  }, [status]);

  const apiKeys = data?.api_keys || [];
  const cloudId = cloud?.cloudId;
  const elasticsearchEndpoint = cloud?.elasticsearchUrl || ELASTICSEARCH_URL_PLACEHOLDER;

  return (
    <>
      {isFlyoutOpen && (
        <CreateApiKeyFlyout
          error={error?.body?.message}
          isLoading={status === Status.LOADING}
          onClose={() => setIsFlyoutOpen(false)}
          setApiKey={saveApiKey}
          username={user?.full_name || user?.username || ''}
        />
      )}
      <EuiPanel>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" direction="row">
          <EuiFlexItem>
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiText size="s">
                  {i18n.translate('xpack.enterpriseSearch.apiKey.elasticsearchEndpoint', {
                    defaultMessage: 'Elasticsearch endpoint:',
                  })}
                </EuiText>
                <EuiSpacer size="s" />

                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiCode>{elasticsearchEndpoint}</EuiCode>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy textToCopy={elasticsearchEndpoint || ''} afterMessage={COPIED_LABEL}>
                      {(copy) => (
                        <EuiButtonIcon
                          onClick={copy}
                          iconType="copyClipboard"
                          aria-label={i18n.translate(
                            'xpack.enterpriseSearch.overview.apiKey.copyApiEndpoint',
                            {
                              defaultMessage: 'Copy Elasticsearch endpoint to clipboard.',
                            }
                          )}
                        />
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {cloudId && (
                <EuiFlexItem>
                  <EuiText size="s">
                    {i18n.translate('xpack.enterpriseSearch.apiKey.cloudId', {
                      defaultMessage: 'Cloud ID:',
                    })}
                  </EuiText>
                  <EuiSpacer size="s" />

                  <EuiFlexGroup direction="row">
                    <EuiFlexItem>
                      <EuiCode>{cloudId}</EuiCode>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCopy textToCopy={cloudId || ''} afterMessage={COPIED_LABEL}>
                        {(copy) => (
                          <EuiButtonIcon
                            onClick={copy}
                            iconType="copyClipboard"
                            aria-label={i18n.translate(
                              'xpack.enterpriseSearch.overview.apiKey.copyCloudID',
                              {
                                defaultMessage: 'Copy cloud ID to clipboard.',
                              }
                            )}
                          />
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                  <EuiFlexItem>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.enterpriseSearch.apiKey.activeKeys"
                        defaultMessage="{number} active API keys."
                        values={{
                          number: (
                            <EuiBadge
                              color={apiKeys.length > 0 ? 'success' : 'warning'}
                              data-test-subj="api-keys-count-badge"
                            >
                              {apiKeys.length}
                            </EuiBadge>
                          ),
                        }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
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
                      >
                        <EuiText size="s">
                          {i18n.translate('xpack.enterpriseSearch.apiKey.newButtonLabel', {
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
                        onClick={() =>
                          navigateToUrl('/app/management/security/api_keys', {
                            shouldNotCreateHref: true,
                          })
                        }
                        target="_blank"
                        data-test-subj="manage-api-keys-button"
                      >
                        {i18n.translate('xpack.enterpriseSearch.apiKey.manageLabel', {
                          defaultMessage: 'Manage',
                        })}
                      </EuiButton>
                    </span>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      {apiKey && (
        <>
          <EuiSpacer />
          <EuiPanel className="apiKeySuccessPanel" data-test-subj="api-key-create-success-panel">
            <EuiStep
              css={css`
                .euiStep__content {
                  padding-bottom: 0;
                }
              `}
              status="complete"
              headingElement="h3"
              title={i18n.translate('xpack.enterpriseSearch.apiKey.apiKeyStepTitle', {
                defaultMessage: 'Store this API key',
              })}
              titleSize="xs"
            >
              <EuiText>
                {i18n.translate('xpack.enterpriseSearch.apiKey.apiKeyStepDescription', {
                  defaultMessage:
                    "You'll only see this key once, so save it somewhere safe. We don't store your API keys, so if you lose a key you'll need to generate a replacement.",
                })}
              </EuiText>
              <EuiSpacer size="s" />
              <EuiCodeBlock isCopyable data-test-subj="api-key-created-key-codeblock">
                {JSON.stringify(apiKey, undefined, 2)}
              </EuiCodeBlock>
            </EuiStep>
          </EuiPanel>
        </>
      )}
    </>
  );
};
