/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { useActions, useValues } from 'kea';

import {
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiPageContentBody,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { CredentialsList } from './credentials_list';
import { CredentialsFlyout } from './credentials_flyout';
import {
  CredentialsLogic,
  ICredentialsLogicActions,
  ICredentialsLogicValues,
} from './credentials_logic';

export const Credentials: React.FC = () => {
  const { initializeCredentialsData, resetCredentials, toggleCredentialsForm } = useActions(
    CredentialsLogic
  ) as ICredentialsLogicActions;

  const { meta, apiUrl, dataLoading, showCredentialsForm } = useValues(
    CredentialsLogic
  ) as ICredentialsLogicValues;

  useEffect(() => {
    initializeCredentialsData();
    return resetCredentials;
  }, []);

  // TODO
  // if (dataLoading) { return <Loading /> }
  if (dataLoading) {
    return null;
  }
  return (
    <>
      <SetPageChrome isRoot />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.credentials.title"
                defaultMessage="Credentials"
              />
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContentBody>
        {showCredentialsForm && <CredentialsFlyout />}
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel style={{ textAlign: 'center' }}>
              <EuiTitle size="s">
                <h2>
                  <FormattedMessage
                    id="xpack.enterpriseSearch.appSearch.credentials.apiEndpoint"
                    defaultMessage="API Endpoint"
                  />
                </h2>
              </EuiTitle>
              <EuiCopy
                textToCopy={apiUrl}
                afterMessage={i18n.translate(
                  'xpack.enterpriseSearch.appSearch.credentials.copied',
                  {
                    defaultMessage: 'Copied',
                  }
                )}
              >
                {(copy) => (
                  <div>
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      aria-label={i18n.translate(
                        'xpack.enterpriseSearch.appSearch.credentials.copyApiEndpoint',
                        {
                          defaultMessage: 'Copy API Endpoint to clipboard',
                        }
                      )}
                    />
                    <span>{apiUrl}</span>
                  </div>
                )}
              </EuiCopy>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xxl" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  id="xpack.enterpriseSearch.appSearch.credentials.apiKeys"
                  defaultMessage="API Keys"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              data-test-subj="CreateAPIKeyButton"
              fill={true}
              onClick={() => toggleCredentialsForm()}
            >
              <FormattedMessage
                id="xpack.enterpriseSearch.appSearch.credentials.createKey"
                defaultMessage="Create a Key"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel>
              <CredentialsList />
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageContentBody>
    </>
  );
};
