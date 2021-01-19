/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FormEvent, useState } from 'react';

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
  EuiOverlayMask,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { ENT_SEARCH_LICENSE_MANAGEMENT } from '../../../routes';
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
  LICENSE_MODAL_TITLE,
  LICENSE_MODAL_DESCRIPTION,
  LICENSE_MODAL_LINK,
} from '../../../constants';

import { LicensingLogic } from '../../../../shared/licensing';
import { ContentSection } from '../../../components/shared/content_section';
import { LicenseBadge } from '../../../components/shared/license_badge';
import { ViewContentHeader } from '../../../components/shared/view_content_header';
import { CredentialItem } from '../../../components/shared/credential_item';
import { SettingsLogic } from '../settings_logic';

export const OauthApplication: React.FC = () => {
  const { setOauthApplication, updateOauthApplication } = useActions(SettingsLogic);
  const { oauthApplication } = useValues(SettingsLogic);
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const [isLicenseModalVisible, setIsLicenseModalVisible] = useState(!hasPlatinumLicense);
  const closeLicenseModal = () => setIsLicenseModalVisible(false);

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

  const licenseModal = (
    <EuiOverlayMask className="oauth-platinum-modal">
      <EuiModal maxWidth={500} onClose={closeLicenseModal} data-test-subj="LicenseModal">
        <EuiModalBody>
          <EuiSpacer size="xl" />
          <LicenseBadge />
          <EuiSpacer />
          <EuiTitle size="l">
            <h1>{LICENSE_MODAL_TITLE}</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">{LICENSE_MODAL_DESCRIPTION}</EuiText>
          <EuiSpacer />
          <EuiLink external target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
            {LICENSE_MODAL_LINK}
          </EuiLink>
          <EuiSpacer />
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );

  return (
    <>
      <form onSubmit={handleSubmit}>
        <EuiForm>
          <ViewContentHeader title={NAV.SETTINGS_OAUTH} description={description} />
          <ContentSection>
            <EuiFormRow label={NAME_LABEL}>
              <EuiFieldText
                value={oauthApplication.name}
                data-test-subj="OAuthAppName"
                onChange={(e) => setOauthApplication({ ...oauthApplication, name: e.target.value })}
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
                  setOauthApplication({ ...oauthApplication, redirectUri: e.target.value })
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
                  setOauthApplication({ ...oauthApplication, confidential: e.target.checked })
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
      </form>

      {isLicenseModalVisible && licenseModal}
    </>
  );
};
