/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useEffect, useState } from 'react';
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
import { CredentialsList } from './credentials_list';

export const Credentials: React.FC = () => {
  return (
    <>
      {/* TODO <SetPageChrome isRoot /> */}
      {/* <SendTelemetry action="viewed" metric="engines_overview" /> */}
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
              <EuiCopy textToCopy="http://www.example.com" afterMessage="Copied">
                {(copy) => (
                  <div>
                    <EuiButtonIcon onClick={copy} iconType="copyClipboard" />
                    <span>http://www.example.com</span>
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
              onClick={() => window.alert(`create a new key`)}
            >
              Create a Key
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
