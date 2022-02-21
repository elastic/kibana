/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FormEvent } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiSwitch,
  EuiCode,
  EuiSpacer,
  EuiLink,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { docLinks } from '../../../../shared/doc_links';
import { LicensingLogic } from '../../../../shared/licensing';
import { WorkplaceSearchPageTemplate } from '../../../components/layout';
import { ContentSection } from '../../../components/shared/content_section';
import { CredentialItem } from '../../../components/shared/credential_item';
import { LicenseBadge } from '../../../components/shared/license_badge';
import {
  CLIENT_ID_LABEL,
  CLIENT_SECRET_LABEL,
  CONFIDENTIAL_HELP_TEXT,
  CONFIDENTIAL_LABEL,
  CREDENTIALS_TITLE,
  CREDENTIALS_DESCRIPTION,
  NAME_LABEL,
  NAV,
  OAUTH_DESCRIPTION,
  OAUTH_PERSISTED_DESCRIPTION,
  REDIRECT_HELP_TEXT,
  REDIRECT_NATIVE_HELP_TEXT,
  REDIRECT_INSECURE_ERROR_TEXT,
  REDIRECT_SECURE_ERROR_TEXT,
  REDIRECT_URIS_LABEL,
  SAVE_CHANGES_BUTTON,
  NON_PLATINUM_OAUTH_TITLE,
  NON_PLATINUM_OAUTH_DESCRIPTION,
  EXPLORE_PLATINUM_FEATURES_LINK,
} from '../../../constants';
import { SettingsLogic } from '../settings_logic';

export const OauthApplication: React.FC = () => {
  const { setOauthApplication, updateOauthApplication } = useActions(SettingsLogic);
  const { oauthApplication } = useValues(SettingsLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  if (!oauthApplication) return null;

  const persisted = !!(oauthApplication.uid && oauthApplication.secret);
  const description = persisted ? OAUTH_PERSISTED_DESCRIPTION : OAUTH_DESCRIPTION;
  const insecureRedirectUri = /(^|\s)http:/i.test(oauthApplication.redirectUri);
  const redirectUris = oauthApplication.redirectUri.split('\n').map((uri) => uri.trim());
  const uniqRedirectUri = Array.from(new Set(redirectUris));
  const redirectUriInvalid = insecureRedirectUri || redirectUris.length !== uniqRedirectUri.length;

  const redirectUriHelpText = (
    <span>
      <strong>{REDIRECT_HELP_TEXT}</strong>{' '}
      {oauthApplication.nativeRedirectUri && (
        <span>
          {REDIRECT_NATIVE_HELP_TEXT} <EuiCode>{oauthApplication.nativeRedirectUri}</EuiCode>
        </span>
      )}
    </span>
  );

  const redirectErrorText = insecureRedirectUri
    ? REDIRECT_INSECURE_ERROR_TEXT
    : REDIRECT_SECURE_ERROR_TEXT;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateOauthApplication();
  };

  const nonPlatinumTitle = (
    <>
      <LicenseBadge />
      <EuiSpacer size="s" />
      <EuiTitle size="l">
        <h1>{NON_PLATINUM_OAUTH_TITLE}</h1>
      </EuiTitle>
    </>
  );

  const nonPlatinumDescription = (
    <>
      <EuiText color="subdued">{NON_PLATINUM_OAUTH_DESCRIPTION}</EuiText>
      <EuiSpacer />
      <EuiLink external target="_blank" href={docLinks.licenseManagement}>
        {EXPLORE_PLATINUM_FEATURES_LINK}
      </EuiLink>
    </>
  );

  return (
    <WorkplaceSearchPageTemplate
      pageChrome={[NAV.SETTINGS, NAV.SETTINGS_OAUTH]}
      pageHeader={{
        pageTitle: hasPlatinumLicense ? NAV.SETTINGS_OAUTH : nonPlatinumTitle,
        description: hasPlatinumLicense ? description : nonPlatinumDescription,
      }}
    >
      <EuiForm component="form" onSubmit={handleSubmit}>
        <EuiSpacer />
        <ContentSection>
          <EuiFormRow label={NAME_LABEL}>
            <EuiFieldText
              value={oauthApplication.name}
              data-test-subj="OAuthAppName"
              onChange={(e) =>
                setOauthApplication({
                  ...oauthApplication,
                  name: e.target.value,
                })
              }
              required
              disabled={!hasPlatinumLicense}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
          <EuiFormRow
            data-test-subj="RedirectURIsRow"
            label={REDIRECT_URIS_LABEL}
            helpText={redirectUriHelpText}
            isInvalid={redirectUriInvalid}
            error={redirectErrorText}
          >
            <EuiTextArea
              value={oauthApplication.redirectUri}
              data-test-subj="RedirectURIsTextArea"
              onChange={(e) =>
                setOauthApplication({
                  ...oauthApplication,
                  redirectUri: e.target.value,
                })
              }
              required
              disabled={!hasPlatinumLicense}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
          <EuiFormRow helpText={CONFIDENTIAL_HELP_TEXT}>
            <EuiSwitch
              label={CONFIDENTIAL_LABEL}
              checked={oauthApplication.confidential}
              data-test-subj="ConfidentialToggle"
              onChange={(e) =>
                setOauthApplication({
                  ...oauthApplication,
                  confidential: e.target.checked,
                })
              }
              disabled={!hasPlatinumLicense}
            />
          </EuiFormRow>
          <EuiSpacer size="xl" />
          <EuiButton
            fill
            color="primary"
            data-test-subj="SaveOAuthApp"
            type="submit"
            disabled={!hasPlatinumLicense}
          >
            {SAVE_CHANGES_BUTTON}
          </EuiButton>
        </ContentSection>
        {persisted && (
          <ContentSection title={CREDENTIALS_TITLE} description={CREDENTIALS_DESCRIPTION}>
            <EuiFormRow>
              <CredentialItem
                label={CLIENT_ID_LABEL}
                value={oauthApplication.uid}
                testSubj="ClientID"
              />
            </EuiFormRow>

            {oauthApplication.confidential && (
              <>
                <EuiSpacer size="s" />
                <EuiFormRow>
                  <CredentialItem
                    label={CLIENT_SECRET_LABEL}
                    value={oauthApplication.secret}
                    testSubj="ClientSecret"
                  />
                </EuiFormRow>
              </>
            )}
          </ContentSection>
        )}
      </EuiForm>
    </WorkplaceSearchPageTemplate>
  );
};
