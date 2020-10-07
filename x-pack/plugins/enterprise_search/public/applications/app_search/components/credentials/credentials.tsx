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
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  EuiSpacer,
  EuiButton,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { CredentialsLogic } from './credentials_logic';
import { externalUrl } from '../../../shared/enterprise_search_url/external_url';
import { CredentialsList } from './credentials_list';

export const Credentials: React.FC = () => {
  const { initializeCredentialsData, resetCredentials, showCredentialsForm } = useActions(
    CredentialsLogic
  );

  const { dataLoading } = useValues(CredentialsLogic);

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
        <EuiPanel className="eui-textCenter">
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.apiEndpoint', {
                defaultMessage: 'Endpoint',
              })}
            </h2>
          </EuiTitle>
          <EuiCopy
            textToCopy={externalUrl.enterpriseSearchUrl}
            afterMessage={i18n.translate('xpack.enterpriseSearch.appSearch.credentials.copied', {
              defaultMessage: 'Copied',
            })}
          >
            {(copy) => (
              <>
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
                {externalUrl.enterpriseSearchUrl}
              </>
            )}
          </EuiCopy>
        </EuiPanel>
        <EuiSpacer size="xxl" />
        <EuiPageContentHeader responsive={false}>
          <EuiPageContentHeaderSection>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.apiKeys', {
                  defaultMessage: 'API Keys',
                })}
              </h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
          <EuiPageContentHeaderSection>
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
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
        <EuiSpacer size="s" />
        <EuiPanel>
          <CredentialsList />
        </EuiPanel>
      </EuiPageContentBody>
    </>
  );
};
