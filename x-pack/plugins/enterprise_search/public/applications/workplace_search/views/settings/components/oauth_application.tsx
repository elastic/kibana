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
  const description = persisted
    ? "Access your organization's OAuth client credentials and manage OAuth settings."
    : 'Create an OAuth client for your organization.';
  const insecureRedirectUri = /(^|\s)http:/i.test(oauthApplication.redirectUri);
  const redirectUris = oauthApplication.redirectUri.split('\n').map((uri) => uri.trim());
  const uniqRedirectUri = Array.from(new Set(redirectUris));
  const redirectUriInvalid = insecureRedirectUri || redirectUris.length !== uniqRedirectUri.length;

  const redirectUriHelpText = (
    <span>
      <strong>Provide one URI per line.</strong>{' '}
      {oauthApplication.nativeRedirectUri && (
        <span>
          For local development URIs, use format{' '}
          <EuiCode>{oauthApplication.nativeRedirectUri}</EuiCode>
        </span>
      )}
    </span>
  );

  const redirectErrorText = insecureRedirectUri
    ? 'Using an insecure redirect URI (http) is not recommended.'
    : 'Cannot contain duplicate redirect URIs.';

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
            <h1>Configuring OAuth for Custom Search Applications</h1>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            Configure an OAuth application for secure use of the Workplace Search Search API.
            Upgrade to a Platinum license to enable the Search API and create your OAuth
            application.
          </EuiText>
          <EuiSpacer />
          <EuiLink external target="_blank" href={ENT_SEARCH_LICENSE_MANAGEMENT}>
            Explore Platinum features
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
          <ViewContentHeader title="OAuth application" description={description} />
          <ContentSection>
            <EuiFormRow label="Name">
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
              label="Redirect URIs"
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
            <EuiFormRow helpText="Deselect for environments in which the client secret cannot be kept confidential, such as native mobile apps and single page applications.">
              <EuiSwitch
                label="Confidential"
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
              Save Changes
            </EuiButton>
          </ContentSection>
          {persisted && (
            <ContentSection
              title="Credentials"
              description="Use the following credentials within your client to request access tokens from our authentication server."
            >
              <EuiFormRow>
                <CredentialItem
                  label="Client id"
                  value={oauthApplication.uid}
                  testSubj="ClientID"
                />
              </EuiFormRow>

              {oauthApplication.confidential && (
                <>
                  <EuiSpacer size="s" />
                  <EuiFormRow>
                    <CredentialItem
                      label="Client secret"
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
