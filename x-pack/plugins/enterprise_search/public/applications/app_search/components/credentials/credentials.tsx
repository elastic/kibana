/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiTitle,
  EuiPanel,
  EuiCopy,
  EuiButtonIcon,
  EuiSpacer,
  EuiButton,
  EuiPageContentHeader_Deprecated as EuiPageContentHeader,
  EuiPageContentHeaderSection_Deprecated as EuiPageContentHeaderSection,
  EuiLoadingContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { externalUrl } from '../../../shared/enterprise_search_url/external_url';
import { AppSearchPageTemplate } from '../layout';

import { CREDENTIALS_TITLE } from './constants';
import { CredentialsFlyout } from './credentials_flyout';
import { CredentialsList } from './credentials_list';
import { CredentialsLogic } from './credentials_logic';

export const Credentials: React.FC = () => {
  const { fetchCredentials, fetchDetails, resetCredentials, showCredentialsForm } =
    useActions(CredentialsLogic);

  const { meta, dataLoading, shouldShowCredentialsForm } = useValues(CredentialsLogic);

  useEffect(() => {
    fetchCredentials();
  }, [meta.page.current]);

  useEffect(() => {
    fetchDetails();
    return () => {
      resetCredentials();
    };
  }, []);

  return (
    <AppSearchPageTemplate
      pageChrome={[CREDENTIALS_TITLE]}
      pageHeader={{ pageTitle: CREDENTIALS_TITLE }}
    >
      {shouldShowCredentialsForm && <CredentialsFlyout />}
      <EuiPanel color="subdued" className="eui-textCenter">
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
                defaultMessage: 'API keys',
              })}
            </h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
        <EuiPageContentHeaderSection>
          {!dataLoading && (
            <EuiButton
              color="primary"
              data-test-subj="CreateAPIKeyButton"
              fill
              onClick={() => showCredentialsForm()}
            >
              {i18n.translate('xpack.enterpriseSearch.appSearch.credentials.createKey', {
                defaultMessage: 'Create key',
              })}
            </EuiButton>
          )}
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiSpacer size="m" />
      <EuiPanel hasBorder>
        {!!dataLoading ? <EuiLoadingContent lines={3} /> : <CredentialsList />}
      </EuiPanel>
    </AppSearchPageTemplate>
  );
};
