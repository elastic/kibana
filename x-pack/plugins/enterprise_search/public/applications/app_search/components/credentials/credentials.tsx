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
import { i18n } from '@kbn/i18n';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import {
  CredentialsLogic,
  ICredentialsLogicActions,
  ICredentialsLogicValues,
} from './credentials_logic';
import { externalUrl } from '../../../shared/enterprise_search_url/external_url';
import { CredentialsList } from './credentials_list';

export const Credentials: React.FC = () => {
  const { initializeCredentialsData, resetCredentials, showCredentialsForm } = useActions(
    CredentialsLogic
  ) as ICredentialsLogicActions;

  const { dataLoading } = useValues(CredentialsLogic) as ICredentialsLogicValues;

  useEffect(() => {
    initializeCredentialsData();
    return () => {
      resetCredentials();
    };
  }, []);

  // TODO
  // if (dataLoading) { return <Loading /> }
  if (dataLoading) {
    return null;
  }
  return (
    <>
      <SetPageChrome
        trail={[
          i18n.translate('xpack.enterpriseSearch.appSearch.credentials.title', {
            defaultMessage: 'Credentials',
          }),
        ]}
      />
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.title', {
                defaultMessage: 'Credentials',
              })}
            </h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContentBody>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiPanel style={{ textAlign: 'center' }}>
              <EuiTitle size="s">
                <h2>
                  {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.apiEndpoint', {
                    defaultMessage: 'Endpoint',
                  })}
                </h2>
              </EuiTitle>
              <EuiCopy
                textToCopy={externalUrl.enterpriseSearchUrl}
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
                          defaultMessage: 'Copy API Endpoint to clipboard.',
                        }
                      )}
                    />
                    <span>{externalUrl.enterpriseSearchUrl}</span>
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
                {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.apiKeys', {
                  defaultMessage: 'API Keys',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              data-test-subj="CreateAPIKeyButton"
              fill={true}
              onClick={() => showCredentialsForm()}
            >
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.createKey', {
                defaultMessage: 'Create a key',
              })}
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
