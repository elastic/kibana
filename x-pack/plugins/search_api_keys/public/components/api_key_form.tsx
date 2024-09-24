/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ApiKeyFlyoutWrapper } from './api_key_flyout_wrapper';
import { useSearchApiKey, Status } from '../hooks/use_search_api_key';

export const ApiKeyForm = () => {
  const { euiTheme } = useEuiTheme();
  const [showFlyout, setShowFlyout] = useState(false);
  const { apiKey, status, handleSaveKey, showAPIKey } = useSearchApiKey();
  const handleAddToClipboard = useCallback(
    () => apiKey && navigator.clipboard.writeText(apiKey),
    [apiKey]
  );

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="flexStart" responsive={false}>
      <EuiFlexItem grow={0}>
        <EuiTitle size="xxxs" css={{ whiteSpace: 'nowrap' }}>
          <h6>
            <FormattedMessage id="xpack.searchApiKeys.apiKeyForm.title" defaultMessage="API Key" />
          </h6>
        </EuiTitle>
      </EuiFlexItem>
      {status === Status.showUserPrivilegesError && (
        <EuiFlexItem grow={0}>
          <EuiBadge data-test-subj="apiKeyFormNoUserPrivileges">
            {i18n.translate('xpack.searchApiKeys.apiKeyForm.noUserPrivileges', {
              defaultMessage: "You don't have access to manage API keys",
            })}
          </EuiBadge>
        </EuiFlexItem>
      )}
      {status !== Status.showCreateButton && (
        <>
          <EuiFlexItem grow={0}>
            <EuiCode
              language="text"
              color="success"
              css={{ color: euiTheme.colors.successText }}
              data-test-subj="apiKeyFormAPIKey"
            >
              {apiKey}
            </EuiCode>
          </EuiFlexItem>
          {status === Status.showPreviewKey && (
            <EuiFlexItem grow={0}>
              <EuiButtonIcon
                iconType="copy"
                color="success"
                onClick={handleAddToClipboard}
                data-test-subj="apiKeyFormAPIKeyCopyButton"
                aria-label={i18n.translate('xpack.searchApiKeys.apiKeyForm.copyButton', {
                  defaultMessage: 'Copy button',
                })}
              />
            </EuiFlexItem>
          )}
          {status === Status.showHiddenKey && (
            <EuiFlexItem grow={0}>
              <EuiButtonIcon
                iconType="eye"
                color="success"
                onClick={showAPIKey}
                data-test-subj="showAPIKeyButton"
                aria-label={i18n.translate('xpack.searchApiKeys.apiKeyForm.showApiKey', {
                  defaultMessage: 'Show API Key',
                })}
              />
            </EuiFlexItem>
          )}
        </>
      )}
      {status === Status.showCreateButton && (
        <EuiFlexItem grow={0}>
          <EuiButton
            color="warning"
            size="s"
            iconSide="left"
            iconType="key"
            onClick={() => setShowFlyout(true)}
            data-test-subj="createAPIKeyButton"
          >
            <FormattedMessage
              id="xpack.searchApiKeys.apiKeyForm.createButton"
              defaultMessage="Create an API Key"
            />
          </EuiButton>
          {showFlyout && (
            <ApiKeyFlyoutWrapper onClose={() => setShowFlyout(false)} onSuccess={handleSaveKey} />
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
