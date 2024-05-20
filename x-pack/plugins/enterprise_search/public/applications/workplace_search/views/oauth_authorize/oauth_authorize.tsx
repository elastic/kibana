/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiCallOut,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiHeaderLogo,
  EuiPage,
  EuiPageBody,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import { FlashMessages } from '../../../shared/flash_messages';
import { Loading } from '../../../shared/loading';

import { WORKPLACE_SEARCH_TITLE } from '../../constants';

import {
  AUTHORIZATION_REQUIRED_TITLE,
  AUTHORIZE_BUTTON_LABEL,
  DENY_BUTTON_LABEL,
  HTTP_REDIRECT_WARNING_MESSAGE,
  SCOPES_LEAD_IN_MESSAGE,
  SEARCH_SCOPE_DESCRIPTION,
  WRITE_SCOPE_DESCRIPTION,
} from './constants';

import { OAuthAuthorizeLogic } from './oauth_authorize_logic';

export const OAuthAuthorize: React.FC = () => {
  const { search } = useLocation() as Location;
  const { initializeOAuthPreAuth, allowOAuthAuthorization, denyOAuthAuthorization } =
    useActions(OAuthAuthorizeLogic);

  const { buttonLoading, dataLoading, cachedPreAuth, hasError } = useValues(OAuthAuthorizeLogic);

  useEffect(() => {
    initializeOAuthPreAuth(search);
  }, []);

  if (dataLoading) return <Loading />;

  const showHttpRedirectUriWarning = cachedPreAuth.redirectUri?.startsWith('http:');

  const httpRedirectUriWarning = (
    <>
      <EuiCallOut title={HTTP_REDIRECT_WARNING_MESSAGE} color="danger" iconType="cross" />
      <EuiSpacer />
    </>
  );

  const scopeDescription = (scopeName: string): string | undefined => {
    if (scopeName === 'search') {
      return SEARCH_SCOPE_DESCRIPTION;
    } else if (scopeName === 'write') {
      return WRITE_SCOPE_DESCRIPTION;
    } else {
      return undefined;
    }
  };

  const scopeListItems = cachedPreAuth?.scopes?.map((scope, i) => {
    const scopeDesc = scopeDescription(scope);
    const unknownScopeDesc = (
      <FormattedMessage
        id="xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.unknownScopeDescription"
        defaultMessage="{unknownAction} your data"
        values={{
          unknownAction: scope,
        }}
      />
    );

    return (
      <li key={i} data-test-subj="ScopeDescription">
        {scopeDesc || unknownScopeDesc}
      </li>
    );
  });

  const authorizationDetails = (
    <>
      <EuiSpacer />
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.workplaceSearch.oauthAuthorize.authorizationDescription"
            defaultMessage="Authorize {strongClientName} to use your account?"
            values={{
              strongClientName: <strong>{cachedPreAuth.clientName}</strong>,
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer />
      {showHttpRedirectUriWarning && httpRedirectUriWarning}
      <EuiCallOut title={SCOPES_LEAD_IN_MESSAGE} iconType="iInCircle">
        <ul>{scopeListItems}</ul>
      </EuiCallOut>
    </>
  );

  return (
    <EuiPage restrictWidth>
      <EuiPageBody>
        <FlashMessages />
        <EuiSpacer />
        <EuiPanel paddingSize="l" style={{ maxWidth: 500, margin: '40px auto' }} grow={false}>
          <EuiHeaderSection>
            <EuiHeaderSectionItem>
              <EuiHeaderLogo iconType="logoWorkplaceSearch" />
              <EuiTitle>
                <h1>{WORKPLACE_SEARCH_TITLE}</h1>
              </EuiTitle>
            </EuiHeaderSectionItem>
          </EuiHeaderSection>
          <EuiSpacer />
          <EuiTitle>
            <h2>{AUTHORIZATION_REQUIRED_TITLE}</h2>
          </EuiTitle>
          {!hasError && authorizationDetails}
          <EuiSpacer />

          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                color="danger"
                onClick={denyOAuthAuthorization}
                disabled={buttonLoading || hasError}
              >
                {DENY_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                color="primary"
                fill
                onClick={allowOAuthAuthorization}
                disabled={buttonLoading || hasError}
              >
                {AUTHORIZE_BUTTON_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
