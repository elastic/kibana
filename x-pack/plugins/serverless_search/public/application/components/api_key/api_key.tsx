/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiStep,
  EuiText,
  EuiThemeProvider,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { ApiKey } from '@kbn/security-plugin/common';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { useKibanaServices } from '../../hooks/use_kibana';
import { MANAGEMENT_API_KEYS } from '../../routes';
import { CreateApiKeyFlyout } from './create_api_key_flyout';

export const ApiKeyPanel: React.FC = () => {
  const { cloud, http, userProfile } = useKibanaServices();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['apiKey'],
    queryFn: () => http.fetch<{ apiKeys: ApiKey[] }>('/internal/serverless_search/api_keys'),
  });
  const [apiKey, setApiKey] = useState<ApiKey | undefined>(undefined);

  return (
    <>
      {isFlyoutOpen && (
        <CreateApiKeyFlyout
          onClose={() => setIsFlyoutOpen(false)}
          setApiKey={setApiKey}
          username={userProfile.user.full_name || userProfile.user.username}
        />
      )}
      {apiKey ? (
        <EuiPanel color="success">
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
            <EuiCodeBlock isCopyable>{JSON.stringify(apiKey, undefined, 2)}</EuiCodeBlock>
          </EuiStep>
        </EuiPanel>
      ) : (
        <EuiPanel>
          <EuiStep
            css={css`
              .euiStep__content {
                padding-bottom: 0;
              }
            `}
            status="incomplete"
            headingElement="h3"
            title={i18n.translate('xpack.serverlessSearch.apiKey.stepOneTitle', {
              defaultMessage: 'Generate and store your API key',
            })}
            titleSize="xs"
          >
            <EuiText size="s">
              {i18n.translate('xpack.serverlessSearch.apiKey.stepOneDescription', {
                defaultMessage: 'Unique identifier for authentication and authorization. ',
              })}
            </EuiText>
            <EuiSpacer size="l" />
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <span>
                      <EuiButton
                        iconType="plusInCircleFilled"
                        size="s"
                        fill
                        onClick={() => setIsFlyoutOpen(true)}
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
                              <EuiBadge color={data.apiKeys.length > 0 ? 'success' : 'warning'}>
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
          </EuiStep>
        </EuiPanel>
      )}
      <EuiSpacer />
      <EuiSplitPanel.Outer>
        <EuiSplitPanel.Inner>
          <EuiStep
            css={css`
              .euiStep__content {
                padding-bottom: 0;
              }
            `}
            headingElement="h3"
            step={2}
            status="incomplete"
            title={i18n.translate('xpack.serverlessSearch.apiKey.stepTwoTitle', {
              defaultMessage: 'Store your unique Cloud ID',
            })}
            titleSize="xs"
          >
            <EuiText>
              {i18n.translate('xpack.serverlessSearch.apiKey.stepTwoDescription', {
                defaultMessage: 'Unique identifier for specific project. ',
              })}
            </EuiText>
          </EuiStep>
        </EuiSplitPanel.Inner>
        <EuiThemeProvider colorMode="dark">
          <EuiSplitPanel.Inner paddingSize="none">
            <EuiCodeBlock
              isCopyable
              fontSize="m"
              // Code block isn't respecting overflow in only this situation
              css={css`
                overflow-wrap: anywhere;
              `}
            >
              {cloud.cloudId ||
                'ProjectXDHS:dXMtd2VzdDIuZ2NwLmVsYXN0aWMtY2xvdWQuY29tJDEwMDYxN2IwMzM3ODRiYWJhODc5NzZiOTA0MTA3NGYwJDQ5ZWM'}
            </EuiCodeBlock>
          </EuiSplitPanel.Inner>
        </EuiThemeProvider>
      </EuiSplitPanel.Outer>
    </>
  );
};
