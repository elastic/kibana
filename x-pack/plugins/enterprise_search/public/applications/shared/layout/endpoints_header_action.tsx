/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useState, useEffect } from 'react';

import { css } from '@emotion/react';
import { useValues, useActions } from 'kea';

import {
  EuiButtonEmpty,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
  EuiCopy,
  EuiButtonIcon,
  EuiBadge,
  EuiHorizontalRule,
  EuiButton,
  EuiHeaderLinks,
  useEuiTheme,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FetchApiKeysAPILogic } from '../../enterprise_search_overview/api/fetch_api_keys_logic';
import { CreateApiKeyFlyout } from '../api_key/create_api_key_flyout';
import { KibanaLogic } from '../kibana';

import { EndpointIcon } from './endpoint_icon';

export const EndpointsHeaderAction: React.FC = ({ children }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const { cloud, esConfig, navigateToUrl } = useValues(KibanaLogic);
  const { makeRequest } = useActions(FetchApiKeysAPILogic);
  const { data } = useValues(FetchApiKeysAPILogic);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { euiTheme } = useEuiTheme();

  useEffect(() => makeRequest({}), []);

  const COPIED_LABEL = i18n.translate('xpack.enterpriseSearch.pageTemplate.apiKey.copied', {
    defaultMessage: 'Copied',
  });

  const apiKeys = data?.api_keys || [];
  const cloudId = cloud?.cloudId;
  const elasticsearchEndpoint = esConfig.elasticsearch_host;

  const button = (
    <EuiButtonEmpty iconType={EndpointIcon} size="s" onClick={() => setPopoverOpen(!isPopoverOpen)}>
      {i18n.translate('xpack.enterpriseSearch.pageTemplate.endpointsButtonLabel', {
        defaultMessage: 'Endpoints & API keys',
      })}
    </EuiButtonEmpty>
  );

  return (
    <EuiHeaderLinks>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {Boolean(children) && <EuiFlexItem>{children}</EuiFlexItem>}
        <EuiFlexItem>
          {isFlyoutOpen && <CreateApiKeyFlyout onClose={() => setIsFlyoutOpen(false)} />}
          <EuiPopover
            button={button}
            isOpen={isPopoverOpen}
            closePopover={() => setPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel
              css={css`
                max-width: calc(${euiTheme.size.xxxxl} * 4);
              `}
              items={[
                <EuiContextMenuItem key="endpoint">
                  <EuiText size="s">
                    {i18n.translate(
                      'xpack.enterpriseSearch.pageTemplate.apiKey.elasticsearchEndpoint',
                      {
                        defaultMessage: 'Elasticsearch endpoint:',
                      }
                    )}
                  </EuiText>
                  <EuiSpacer size="s" />

                  <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                    <EuiFlexItem>
                      <EuiCode
                        css={css`
                          overflow-wrap: anywhere;
                        `}
                      >
                        {elasticsearchEndpoint}
                      </EuiCode>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCopy textToCopy={elasticsearchEndpoint || ''} afterMessage={COPIED_LABEL}>
                        {(copy) => (
                          <EuiButtonIcon
                            onClick={copy}
                            iconType="copyClipboard"
                            aria-label={i18n.translate(
                              'xpack.enterpriseSearch.overview.pageTemplate.apiKey.copyApiEndpoint',
                              {
                                defaultMessage: 'Copy Elasticsearch endpoint to clipboard.',
                              }
                            )}
                          />
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiContextMenuItem>,
                ...(Boolean(cloudId)
                  ? [
                      <EuiContextMenuItem key="cloudId">
                        <EuiText size="s">
                          {i18n.translate('xpack.enterpriseSearch.apiKey.cloudId', {
                            defaultMessage: 'Cloud ID:',
                          })}
                        </EuiText>
                        <EuiSpacer size="s" />

                        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                          <EuiFlexItem>
                            <EuiCode
                              css={css`
                                overflow-wrap: anywhere;
                              `}
                            >
                              {cloudId}
                            </EuiCode>
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
                      </EuiContextMenuItem>,
                    ]
                  : []),
                <EuiContextMenuItem key="apiKeys">
                  <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
                    <EuiFlexItem>
                      <EuiText size="xs" color="subdued">
                        <FormattedMessage
                          id="xpack.enterpriseSearch.endpointsHeader.apiKey.activeKeys"
                          defaultMessage="{number} active API keys"
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
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        aria-label={i18n.translate(
                          'xpack.enterpriseSearch.pageTemplate.apiKey.manageLabel',
                          {
                            defaultMessage: 'Manage',
                          }
                        )}
                        iconType="gear"
                        onClick={() =>
                          navigateToUrl('/app/management/security/api_keys', {
                            shouldNotCreateHref: true,
                          })
                        }
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiContextMenuItem>,
                <EuiHorizontalRule margin="xs" key="rule" />,
                <EuiContextMenuItem key="createApiKey">
                  <EuiButton
                    iconType="plusInCircle"
                    size="s"
                    onClick={() => {
                      setIsFlyoutOpen(true);
                      setPopoverOpen(false);
                    }}
                    data-test-subj="new-api-key-button"
                    fullWidth
                  >
                    <EuiText size="s">
                      {i18n.translate('xpack.enterpriseSearch.pageTemplate.apiKey.newButtonLabel', {
                        defaultMessage: 'New API key',
                      })}
                    </EuiText>
                  </EuiButton>
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiHeaderLinks>
  );
};
