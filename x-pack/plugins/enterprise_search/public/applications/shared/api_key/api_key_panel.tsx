/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ELASTICSEARCH_URL_PLACEHOLDER } from '@kbn/search-api-panels/constants';
import { AuthenticatedUser } from '@kbn/security-plugin/common';

import { Status } from '../../../../common/types/api';

import { CreateApiKeyAPILogic } from '../../enterprise_search_overview/api/create_elasticsearch_api_key_logic';
import { FetchApiKeysAPILogic } from '../../enterprise_search_overview/api/fetch_api_keys_logic';
import { KibanaLogic } from '../kibana';

import { CreateApiKeyFlyout } from './create_api_key_flyout';

interface ApiKeyPanelProps {
  user: AuthenticatedUser | null;
}

const COPIED_LABEL = i18n.translate('xpack.enterpriseSearch.overview.apiKey.copied', {
  defaultMessage: 'Copied',
});

export const ApiKeyPanel: React.FC<ApiKeyPanelProps> = ({ user }) => {
  const { cloud, navigateToUrl } = useValues(KibanaLogic);
  const { makeRequest } = useActions(FetchApiKeysAPILogic);
  const { makeRequest: saveApiKey } = useActions(CreateApiKeyAPILogic);
  const { error, status } = useValues(CreateApiKeyAPILogic);
  const { data } = useValues(FetchApiKeysAPILogic);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  useEffect(() => makeRequest({}), []);

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
      <EuiSplitPanel.Outer>
        {Boolean(cloud) && (
          <EuiSplitPanel.Inner>
            <EuiText size="s">
              {i18n.translate('xpack.enterpriseSearch.apiKey.elasticsearchEndpoint', {
                defaultMessage: 'Elasticsearch endpoint:',
              })}
            </EuiText>
            <EuiSpacer size="s" />

            <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
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
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate('xpack.enterpriseSearch.apiKey.cloudId', {
                defaultMessage: 'Cloud ID:',
              })}
            </EuiText>
            <EuiSpacer size="s" />

            <EuiFlexGroup direction="row" justifyContent="spaceBetween" alignItems="center">
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
          </EuiSplitPanel.Inner>
        )}
        <EuiSplitPanel.Inner color="subdued">
          <EuiFlexGroup direction="row" alignItems="center" justifyContent="flexEnd">
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
            <EuiFlexItem grow={false}>
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
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </>
  );
};
